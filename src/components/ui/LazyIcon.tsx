import React, { Suspense, memo, lazy } from "react";
import type { LucideProps } from "lucide-react";

// Define icon components with explicit imports - this is statically analyzable by Vite
const IconComponents: Record<string, React.LazyExoticComponent<React.ComponentType<LucideProps>>> = {
  'arrowrighttoline': lazy(() => import('lucide-react/dist/esm/icons/arrow-right-to-line.js')),
  'check': lazy(() => import('lucide-react/dist/esm/icons/check.js')),
  'checkicon': lazy(() => import('lucide-react/dist/esm/icons/check.js')),
  'chevrondown': lazy(() => import('lucide-react/dist/esm/icons/chevron-down.js')),
  'chevronleft': lazy(() => import('lucide-react/dist/esm/icons/chevron-left.js')),
  'chevronright': lazy(() => import('lucide-react/dist/esm/icons/chevron-right.js')),
  'chevronup': lazy(() => import('lucide-react/dist/esm/icons/chevron-up.js')),
  'circle': lazy(() => import('lucide-react/dist/esm/icons/circle.js')),
  'clipboardicon': lazy(() => import('lucide-react/dist/esm/icons/clipboard.js')),
  'dot': lazy(() => import('lucide-react/dist/esm/icons/dot.js')),
  'download': lazy(() => import('lucide-react/dist/esm/icons/download.js')),
  'externallink': lazy(() => import('lucide-react/dist/esm/icons/external-link.js')),
  'keyround': lazy(() => import('lucide-react/dist/esm/icons/key-round.js')),
  'mail': lazy(() => import('lucide-react/dist/esm/icons/mail.js')),
  'moon': lazy(() => import('lucide-react/dist/esm/icons/moon.js')),
  'morehorizontal': lazy(() => import('lucide-react/dist/esm/icons/more-horizontal.js')),
  'plane': lazy(() => import('lucide-react/dist/esm/icons/plane.js')),
  'sailboat': lazy(() => import('lucide-react/dist/esm/icons/sailboat.js')),
  'settings': lazy(() => import('lucide-react/dist/esm/icons/settings.js')),
  'sheet': lazy(() => import('lucide-react/dist/esm/icons/sheet.js')),
  'shield': lazy(() => import('lucide-react/dist/esm/icons/shield.js')),
  'sun': lazy(() => import('lucide-react/dist/esm/icons/sun.js')),
  'x': lazy(() => import('lucide-react/dist/esm/icons/x.js')),
  'gitpullrequest': lazy(() => import('lucide-react/dist/esm/icons/git-pull-request.js')),
  'bookopentext': lazy(() => import('lucide-react/dist/esm/icons/book-open-text.js')),
  'infinity': lazy(() => import('lucide-react/dist/esm/icons/infinity.js')),
  'github': lazy(() => import('lucide-react/dist/esm/icons/github.js')),
  'messagesquaretext': lazy(() => import('lucide-react/dist/esm/icons/message-square-text.js')),
  'circleuserround': lazy(() => import('lucide-react/dist/esm/icons/circle-user-round.js')),
  'joystick': lazy(() => import('lucide-react/dist/esm/icons/joystick.js')),
  'atsign': lazy(() => import('lucide-react/dist/esm/icons/at-sign.js')),
  'listx': lazy(() => import('lucide-react/dist/esm/icons/list-x.js')),
  'listchecks': lazy(() => import('lucide-react/dist/esm/icons/list-checks.js')),
  'eyeoff': lazy(() => import('lucide-react/dist/esm/icons/eye-off.js')),
  'bug': lazy(() => import('lucide-react/dist/esm/icons/bug.js')),
  'rotateccw': lazy(() => import('lucide-react/dist/esm/icons/rotate-ccw.js')),
  'pause': lazy(() => import('lucide-react/dist/esm/icons/pause.js')),
  'play': lazy(() => import('lucide-react/dist/esm/icons/play.js')),
  'user': lazy(() => import('lucide-react/dist/esm/icons/user.js')),
};
type LazyIconProps = {
  name: string;
  size?: number;
  fallback?: React.ReactNode;
  className?: string;
  onClick?: (event: React.MouseEvent<SVGElement>) => void;
};

export const IconPlaceholder = <svg width={22} height={22} />;
const IconPlaceholderSized = ({ size = 22, className }: { size?: number; className?: string }) => (
  <svg width={size} height={size} className={className} />
);

const LazyIcon: React.FC<LazyIconProps & React.HTMLAttributes<SVGElement>> = memo(
  ({ name, size = 22, className, fallback = <IconPlaceholderSized size={size} className={className} />, onClick, ...rest }) => {
    const iconName = name.toLowerCase();
    const IconComponent = IconComponents[iconName];

    // If the icon doesn't exist, show a warning in development
    if (!IconComponent && process.env.NODE_ENV === 'development') {
      console.warn(`Icon "${iconName}" not found in IconComponents. Add it to the list.`);
      return fallback;
    }

    return (
      <Suspense fallback={fallback}>
        <IconComponent
            size={size}
            className={className}
            onClick={onClick}
            {...rest} // Forward all remaining props including data attributes
          />
      </Suspense>
    );
  }
);

export default LazyIcon;