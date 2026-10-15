/**
 * Toast wrapper — pairs Sonner with haptic + sound feedback on outcomes.
 */
import {
  feedbackError,
  feedbackSuccess,
  feedbackWarning,
} from "@/lib/feedback";
import { toast as sonner, type ExternalToast } from "sonner";

type ToastOpts = ExternalToast;

function withSuccessFeedback<T>(result: T): T {
  feedbackSuccess();
  return result;
}

function withErrorFeedback<T>(result: T): T {
  feedbackError();
  return result;
}

function withWarningFeedback<T>(result: T): T {
  feedbackWarning();
  return result;
}

export const toast = {
  success: (message: string, opts?: ToastOpts) =>
    withSuccessFeedback(sonner.success(message, opts)),

  error: (message: string, opts?: ToastOpts) =>
    withErrorFeedback(sonner.error(message, opts)),

  warning: (message: string, opts?: ToastOpts) =>
    withWarningFeedback(sonner.warning(message, opts)),

  message: sonner.message,
  info: sonner.info,
  loading: sonner.loading,
  promise: sonner.promise,
  custom: sonner.custom,
  dismiss: sonner.dismiss,
};
