"use client";

import { useEffect, useRef, useState } from "react";
import { AuthField, authInputClassName } from "@/components/auth/auth-field";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentMedia,
  AttachmentTitle,
  AttachmentTrigger,
} from "@/components/ui/attachment";
import { Button } from "@/components/ui/button";
import { DialogShell } from "@/components/ui/dialog-shell";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import type { SafeUser } from "@/types/user";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Lock,
  RefreshCw,
  XIcon,
  User,
} from "lucide-react";
import { toast } from "sonner";

type UploadState = "idle" | "uploading" | "error" | "done";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type ProfileEditDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: SafeUser;
  onUpdated: (user: SafeUser) => void;
};

export function ProfileEditDialog({
  open,
  onOpenChange,
  user,
  onUpdated,
}: ProfileEditDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user.name);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [previewUrl, setPreviewUrl] = useState(user.avatarUrl ?? "");
  const [fileLabel, setFileLabel] = useState("profile-photo");
  const [fileMeta, setFileMeta] = useState("JPG, PNG, WebP or GIF · max 2 MB");
  const [uploadState, setUploadState] = useState<UploadState>(
    user.avatarUrl ? "done" : "idle",
  );
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(user.name);
    setAvatarUrl(user.avatarUrl ?? "");
    setPreviewUrl(user.avatarUrl ?? "");
    setFileLabel("profile-photo");
    setFileMeta("JPG, PNG, WebP or GIF · max 2 MB");
    setUploadState(user.avatarUrl ? "done" : "idle");
  }, [open, user]);

  function clearPhoto() {
    setAvatarUrl("");
    setPreviewUrl("");
    setFileLabel("profile-photo");
    setFileMeta("JPG, PNG, WebP or GIF · max 2 MB");
    setUploadState("idle");
    if (fileRef.current) fileRef.current.value = "";
  }

  async function uploadFile(file: File) {
    setUploadState("uploading");
    setFileLabel(file.name);
    setFileMeta(
      `${file.type.split("/")[1]?.toUpperCase() ?? "IMG"} · ${formatBytes(file.size)}`,
    );
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);

    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/auth/avatar", {
        method: "POST",
        credentials: "include",
        body,
      });
      const json = (await res.json()) as {
        data?: { url: string; user: SafeUser };
        error?: { message: string };
      };
      URL.revokeObjectURL(localPreview);
      if (!res.ok || !json.data?.url) {
        setUploadState("error");
        setPreviewUrl(avatarUrl || user.avatarUrl || "");
        toast.error(json.error?.message ?? "Upload failed.");
        return;
      }
      setAvatarUrl(json.data.url);
      setPreviewUrl(json.data.url);
      setUploadState("done");
      if (json.data.user) {
        onUpdated(json.data.user);
      }
      toast.success("Photo uploaded.");
    } catch {
      URL.revokeObjectURL(localPreview);
      setUploadState("error");
      setPreviewUrl(avatarUrl || user.avatarUrl || "");
      toast.error("Network error. Try again.");
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    void uploadFile(file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Name is required.");
      return;
    }
    if (uploadState === "uploading") {
      toast.message("Wait for the photo upload to finish.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: trimmedName,
          avatarUrl,
        }),
      });
      const json = (await res.json()) as {
        data?: { user: SafeUser };
        error?: { message: string };
      };
      if (!res.ok || !json.data?.user) {
        toast.error(json.error?.message ?? "Could not update profile.");
        return;
      }
      onUpdated(json.data.user);
      onOpenChange(false);
      toast.success("Profile updated.");
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<User className="size-5" aria-hidden />}
      title="Edit profile"
      description="Update your display name and profile photo."
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending || uploadState === "uploading"}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="profile-edit-form"
            disabled={pending || uploadState === "uploading"}
          >
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </>
      }
    >
      <form id="profile-edit-form" onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="edit-name">Display name</Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={80}
            autoComplete="name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label>Profile photo</Label>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={onFileChange}
          />

          {uploadState === "idle" ? (
            <Attachment state="idle" className="w-full">
              <AttachmentMedia>
                <ImagePlus />
              </AttachmentMedia>
              <AttachmentContent>
                <AttachmentTitle>Add profile photo</AttachmentTitle>
                <AttachmentDescription>
                  JPG, PNG, WebP or GIF · max 2 MB
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentTrigger
                aria-label="Choose profile photo"
                onClick={() => fileRef.current?.click()}
              />
            </Attachment>
          ) : (
            <Attachment state={uploadState} className="w-full">
              {uploadState === "uploading" ? (
                <AttachmentMedia>
                  <Spinner />
                </AttachmentMedia>
              ) : previewUrl ? (
                <AttachmentMedia variant="image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Profile preview" />
                </AttachmentMedia>
              ) : (
                <AttachmentMedia>
                  <ImagePlus />
                </AttachmentMedia>
              )}
              <AttachmentContent>
                <AttachmentTitle>{fileLabel}</AttachmentTitle>
                <AttachmentDescription>
                  {uploadState === "uploading"
                    ? "Uploading…"
                    : uploadState === "error"
                      ? "Upload failed. Try again."
                      : fileMeta}
                </AttachmentDescription>
              </AttachmentContent>
              <AttachmentActions>
                {uploadState === "error" ? (
                  <AttachmentAction
                    type="button"
                    aria-label="Retry photo upload"
                    onClick={() => fileRef.current?.click()}
                  >
                    <RefreshCw />
                  </AttachmentAction>
                ) : null}
                <AttachmentAction
                  type="button"
                  aria-label="Remove profile photo"
                  disabled={uploadState === "uploading"}
                  onClick={clearPhoto}
                >
                  <XIcon />
                </AttachmentAction>
              </AttachmentActions>
              {uploadState === "done" ? (
                <AttachmentTrigger
                  aria-label="Replace profile photo"
                  onClick={() => fileRef.current?.click()}
                />
              ) : null}
            </Attachment>
          )}
        </div>
      </form>
    </DialogShell>
  );
}

type ChangePasswordDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasPassword?: boolean;
};

export function ChangePasswordDialog({
  open,
  onOpenChange,
  hasPassword = true,
}: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
  }, [open]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: hasPassword ? currentPassword : undefined,
          newPassword,
        }),
      });
      const json = (await res.json()) as {
        data?: { message: string };
        error?: { message: string };
      };
      if (!res.ok) {
        toast.error(json.error?.message ?? "Could not update password.");
        return;
      }
      toast.success(json.data?.message ?? "Password updated.");
      onOpenChange(false);
    } catch {
      toast.error("Network error. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <DialogShell
      open={open}
      onOpenChange={onOpenChange}
      icon={<Lock className="size-5" aria-hidden />}
      title={hasPassword ? "Change password" : "Set password"}
      description={
        hasPassword
          ? "Enter your current password, then choose a new one."
          : "Add a password so you can also sign in without Google."
      }
      footer={
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="submit" form="change-password-form" disabled={pending}>
            {pending
              ? "Saving…"
              : hasPassword
                ? "Update password"
                : "Set password"}
          </Button>
        </>
      }
    >
      <form id="change-password-form" onSubmit={onSubmit} className="space-y-4">
        {hasPassword && (
          <AuthField id="dlg-current-password" label="Current password" icon={Lock}>
            <input
              id="dlg-current-password"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••"
              className={`${authInputClassName} pr-11`}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label={showCurrent ? "Hide password" : "Show password"}
            >
              {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </AuthField>
        )}

        <AuthField id="dlg-new-password" label="New password" icon={Lock}>
          <input
            id="dlg-new-password"
            type={showNew ? "text" : "password"}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            placeholder="Min. 6 characters"
            className={`${authInputClassName} pr-11`}
            required
          />
          <button
            type="button"
            onClick={() => setShowNew((v) => !v)}
            className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            aria-label={showNew ? "Hide password" : "Show password"}
          >
            {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </AuthField>

        <AuthField id="dlg-confirm-password" label="Confirm new password" icon={Lock}>
          <input
            id="dlg-confirm-password"
            type={showNew ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            autoComplete="new-password"
            minLength={6}
            placeholder="Repeat new password"
            className={authInputClassName}
            required
          />
        </AuthField>
      </form>
    </DialogShell>
  );
}
