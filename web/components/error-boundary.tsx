"use client";
import { Component, type ReactNode } from "react";

export default class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed)
      return (
        <div className="site-container py-6" role="alert">
          <p className="text-[var(--text-secondary)]">
            This part of the page could not be loaded.
          </p>
          <button
            type="button"
            className="editorial-link mt-2"
            onClick={() => this.setState({ failed: false })}
          >
            Try again
          </button>
        </div>
      );
    return this.props.children;
  }
}
