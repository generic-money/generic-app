import { toast } from "sonner";

export type AlertType = "success" | "info" | "warning" | "error";

export type AlertPayload = {
  type: AlertType;
  title?: string;
  message?: string;
  duration?: number;
};

const defaultTitles: Record<AlertType, string> = {
  success: "Success",
  info: "Notice",
  warning: "Warning",
  error: "Error",
};

export const pushAlert = ({ type, title, message, duration }: AlertPayload) => {
  const resolvedTitle = title ?? defaultTitles[type];
  const options = {
    description: message,
    duration,
  };

  switch (type) {
    case "success":
      toast.success(resolvedTitle, options);
      break;
    case "info":
      toast.info(resolvedTitle, options);
      break;
    case "warning":
      toast.warning(resolvedTitle, options);
      break;
    case "error":
      toast.error(resolvedTitle, options);
      break;
    default:
      toast(resolvedTitle, options);
  }
};
