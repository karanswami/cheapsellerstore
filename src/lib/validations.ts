import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(32)
    .regex(/^[a-zA-Z0-9_]+$/, "Username: letters, numbers, underscore only"),
  email: z.string().trim().email("Invalid email").max(120),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  /** Optional invite code from a referrer. Empty / omitted = no referrer. */
  referralCode: z
    .string()
    .trim()
    .max(64)
    .optional()
    .or(z.literal("")),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Username or email is required").max(120),
  password: z.string().min(1, "Password is required").max(128),
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email").max(120),
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email("Invalid email").max(120),
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "Enter the 6-digit code from your email"),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().max(128).optional(),
    newPassword: z
      .string()
      .min(6, "New password must be at least 6 characters")
      .max(128),
  })
  .refine(
    (data) =>
      !data.currentPassword || data.currentPassword !== data.newPassword,
    {
      message: "New password must be different from current password",
      path: ["newPassword"],
    },
  );

const socialLinkSchema = z.object({
  telegram: z.string().trim().max(100).optional(),
  discord: z.string().trim().max(100).optional(),
  youtube: z.string().trim().max(100).optional(),
  twitter: z.string().trim().max(100).optional(),
  instagram: z.string().trim().max(100).optional(),
});

/** Empty / null clears the field. Short string must include a pictographic emoji. */
const emojiStatusSchema = z.union([
  z.literal(""),
  z.null(),
  z
    .string()
    .trim()
    .min(1)
    .max(8, "Emoji status must be a single emoji")
    .regex(/\p{Extended_Pictographic}/u, "Must be a valid emoji"),
]);

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(80).optional(),
    avatarUrl: z
      .union([
        z.literal(""),
        z
          .string()
          .trim()
          .max(500)
          .regex(
            /^\/api\/media\/avatar\/[a-f0-9]+\.(jpg|jpeg|png|webp|gif)$/i,
            "Invalid avatar reference.",
          ),
      ])
      .optional(),
    bio: z
      .union([
        z.literal(""),
        z.null(),
        z.string().trim().max(500, "Bio must be 500 characters or less"),
      ])
      .optional(),
    isProfilePublic: z.boolean().optional(),
    socialLinks: socialLinkSchema.nullable().optional(),
    featuredProducts: z
      .array(z.string().min(1, "Invalid product ID"))
      .max(6, "You can feature up to 6 products")
      .optional(),
    profileBorder: z.enum(["NONE", "PREMIUM", "VIP"]).optional(),
    emojiStatus: emojiStatusSchema.optional(),
  })
  .refine(
    (data) =>
      data.name !== undefined ||
      data.avatarUrl !== undefined ||
      data.bio !== undefined ||
      data.isProfilePublic !== undefined ||
      data.socialLinks !== undefined ||
      data.featuredProducts !== undefined ||
      data.profileBorder !== undefined ||
      data.emojiStatus !== undefined,
    {
      message: "Nothing to update.",
    },
  );

export const bioCustomLinkSchema = z.object({
  id: z.string().trim().min(1).max(64),
  title: z.string().trim().min(1, "Link title required").max(60),
  url: z.string().trim().min(1, "URL required").max(500),
  icon: z.string().trim().max(40).optional(),
  badge: z.string().trim().max(30).optional(),
  isPinned: z.boolean().optional(),
});

export const bioConfigSchema = z.object({
  bioTheme: z
    .enum([
      "DEFAULT",
      "NEON_TOXIC",
      "PHANTOM_VIOLET",
      "GLACIER_CYAN",
      "CRIMSON_FURY",
      "GOLD_OBSIDIAN",
    ])
    .optional(),
  bioTagline: z.string().trim().max(120, "Tagline under 120 chars").nullable().optional(),
  bioBannerUrl: z.string().trim().max(500).nullable().optional(),
  bioPromoCode: z.string().trim().max(32).nullable().optional(),
  bioLinks: z.array(bioCustomLinkSchema).max(20, "Max 20 links").nullable().optional(),
  showVouches: z.boolean().optional(),
  discordInvite: z.string().trim().max(120).nullable().optional(),
  telegramChannel: z.string().trim().max(120).nullable().optional(),
  youtubeVideoUrl: z.string().trim().max(300).nullable().optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  isProfilePublic: z.boolean().optional(),
  featuredProducts: z.array(z.string().min(1)).max(12).optional(),
});


export const checkoutSchema = z.object({
  discord: z.string().trim().max(64).optional(),
  promoCode: z.string().trim().max(64).optional(),
  items: z
    .array(
      z.object({
        durationId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
        androidId: z.string().trim().max(128).optional().nullable(),
      }),
    )
    .min(1),
});

export const supportChatSchema = z
  .object({
    message: z.string().trim().max(1000, "Message is too long").optional(),
    stepId: z.string().trim().max(64).optional().nullable(),
    buttonId: z.string().trim().max(64).optional().nullable(),
    buttonAction: z.string().trim().max(64).optional().nullable(),
  })
  .refine(
    (v) =>
      Boolean(v.message?.trim()) ||
      Boolean(v.buttonId?.trim()) ||
      Boolean(v.buttonAction?.trim()),
    { message: "Enter a message or choose a button." },
  );
