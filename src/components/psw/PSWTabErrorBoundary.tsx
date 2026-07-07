import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  tabName: string;
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Localised error boundary around each PSW dashboard tab.
 * A runtime error in one tab must not crash the whole dashboard.
 */
export class PSWTabErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    console.error(`[PSWTabErrorBoundary:${this.props.tabName}]`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ error: null });
  };

  render() {
    if (this.state.error) {
      return (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="p-6 text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">
                We couldn’t load this section.
              </p>
              <p className="text-sm text-muted-foreground">
                {this.props.tabName} hit a temporary error. Other tabs still work.
              </p>
              {this.state.error.message && (
                <p className="text-xs text-muted-foreground/70 mt-2 break-words">
                  {this.state.error.message}
                </p>
              )}
            </div>
            <Button onClick={this.handleRetry} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Try again
            </Button>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}
