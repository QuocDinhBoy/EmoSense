import { toast } from "sonner";

export const notify = {
  success: (msg: string, opts: any = {}) => toast.success(msg, { duration: 1800, ...opts }),
  error: (msg: string, opts: any = {}) => toast.error(msg, { duration: 2400, ...opts }),
  info: (msg: string, opts: any = {}) => toast(msg, { duration: 1800, ...opts }),
};
