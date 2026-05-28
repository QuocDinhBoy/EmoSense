import { Component, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: any) {
    console.error("[ErrorBoundary]", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="min-h-[60vh] grid place-items-center p-6">
          <div className="card-3d p-8 max-w-md text-center space-y-4">
            <h1 className="font-display text-2xl font-bold">Có gì đó chưa ổn 💛</h1>
            <p className="text-muted-foreground text-sm">Đừng lo, hãy thử lại nhé.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="hero" onClick={() => { this.setState({ error: null }); }}>Thử lại</Button>
              <Button variant="outline" onClick={() => { window.location.href = "/app"; }}>Về trang chủ</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
