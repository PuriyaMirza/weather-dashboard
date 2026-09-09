'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { CardFrame, CardState } from './card-frame';

interface ModuleBoundaryProps {
  /** Named so the failure says which module broke, rather than leaving the user to guess. */
  title: string;
  description: string;
  children: ReactNode;
}

interface ModuleBoundaryState {
  hasError: boolean;
}

/**
 * Contains a render error to the module that caused it.
 *
 * Without this, one module throwing takes down the entire page — React unmounts the whole tree,
 * so a single bad reading costs the user their location, their layout, and every other module too.
 * That risk grew when the readings became table-generated (`lib/weather/metrics.ts`): a `read()`
 * that touches a field the upstream stopped sending is one typo away, and it would white-screen
 * a dashboard that is otherwise entirely healthy.
 *
 * A class component because React still provides no hook equivalent for `componentDidCatch`.
 *
 * Deliberately has no "try again" affordance: a render error is a bug in this build, and
 * re-rendering the same component with the same props reproduces it. The honest offer is the
 * rest of the dashboard, not a button that cannot help.
 */
export class ModuleBoundary extends Component<ModuleBoundaryProps, ModuleBoundaryState> {
  state: ModuleBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ModuleBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Swallowing this would trade a white screen for a silent one. The component stack is what
    // makes the report actionable.
    console.error(`[dashboard] "${this.props.title}" module failed to render:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <CardFrame title={this.props.title} description={this.props.description}>
          {/* Reuses the shared failed-state visual, so a broken module reads like every other
              unavailable one rather than announcing itself as something exotic. */}
          <CardState label="This module ran into a problem and can’t be shown." tone="error" />
        </CardFrame>
      );
    }

    return this.props.children;
  }
}
