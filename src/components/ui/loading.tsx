interface LoadingProps {
    variant?: LoadingVariant;
    dark?: boolean;
    size?: number;
}

export type LoadingVariant = 'circle' | 'horizontal' | 'shimmer' | 'pulse' | 'border' | 'ripple' | 'cosmic' | 'quantum' | 'elastic' | 'orbit' | 'rings' | 'random';
const variants = ['circle', 'horizontal', 'shimmer', 'pulse', 'border', 'ripple', 'cosmic', 'quantum', 'elastic', 'orbit', 'rings'];

export default function Loading({ variant = 'ripple', dark, size }: LoadingProps) {
    switch (variant) {
        case 'horizontal':
            return <HorizontalProgressLoader dark={dark} />;
        case 'shimmer':
            return <ButtonShimmer dark={dark} />;
        case 'pulse':
            return <ButtonPulse dark={dark} />;
        case 'border':
            return <FadingBorder dark={dark} />;
        case 'circle':
            return <LoadingCircle dark={dark} size={size} />;
        case 'ripple':
            return <WaveRipple dark={dark} />;
        case 'cosmic':
            return <CosmicLoader dark={dark} />;
        case 'quantum':
            return <QuantumDots dark={dark} />;
        case 'elastic':
            return <ElasticDots dark={dark} />;
        case 'orbit':
            return <OrbitLoader dark={dark} />;
        case 'rings':
            return <RingsLoader dark={dark} />;
        case 'random': {
            const randomVariant = variants[Math.floor(Math.random() * variants.length)];
            return <Loading variant={randomVariant as LoadingVariant} dark={dark} size={size} />;
        }
    }
}

export function RingsLoader({ dark }: { dark?: boolean }) {
    const ringColor1 = dark ? "border-gray-400" : "border-blue-500";
    const ringColor2 = dark ? "border-gray-600" : "border-blue-300";

    return (
        <div className="relative flex items-center justify-center h-6 w-6">
            {/* Ring 1 */}
            <div
                className={`absolute h-6 w-6 rounded-full border-2 ${ringColor1} border-t-transparent`}
                style={{ animation: 'spin 1.2s linear infinite', animationDirection: 'normal' }}
            ></div>
            <div
                className={`absolute h-4 w-4 rounded-full border-2 ${ringColor2} border-b-transparent`}
                style={{ animation: 'spin 0.9s linear infinite, ringPulse 1.8s ease-in-out infinite', animationDirection: 'reverse' }}
            ></div>
            <style>{`
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(720deg); }
                }
                @keyframes ringPulse {
                    0%, 100% { opacity: 1; transform: scale(0.9) rotate(0deg); }
                    50% { opacity: 0.7; transform: scale(1.1) rotate(1080deg); }
                }
            `}</style>
        </div>
    );
}

export function OrbitLoader({ dark }: { dark?: boolean }) {
    const dotColor = dark ? "bg-gray-400" : "bg-blue-500";
    const numDots = 3; // Number of orbiting dots
    const animationDuration = 1.8; // Duration in seconds

    return (
        <div className="relative flex items-center justify-center h-6 w-6">
            {[...Array(numDots)].map((_, i) => (
                <div
                    key={i}
                    // Position dots absolutely; animation handles movement
                    className={`absolute w-1.5 h-1.5 rounded-full ${dotColor}`}
                    style={{
                        // Apply the custom animation
                        animation: `pulsingOrbit ${animationDuration}s ease-in-out infinite`,
                        // Stagger the start time for each dot
                        animationDelay: `${(i / numDots) * animationDuration}s`,
                    }}
                ></div>
            ))}
            <style>{`
                @keyframes pulsingOrbit {
                    0% {
                        /* Start position (right), small size, low opacity */
                        transform: rotate(0deg) translateX(8px) scale(0.7);
                        opacity: 0.5;
                    }
                    50% {
                        /* Mid position (left), large size, full opacity */
                        transform: rotate(180deg) translateX(8px) scale(1.1);
                        opacity: 1;
                    }
                    100% {
                        /* End position (back to right), small size, low opacity */
                        transform: rotate(360deg) translateX(8px) scale(0.7);
                        opacity: 0.5;
                    }
                }
            `}</style>
        </div>
    );
}

export function CosmicLoader({ dark }: { dark?: boolean }) {
    const innerColor = dark ? "border-gray-700" : "border-blue-200";
    const outerColor = dark ? "border-gray-400" : "border-blue-500";

    return (
        <div className="relative flex items-center justify-center h-8 w-8">
            <div className={`absolute h-8 w-8 rounded-full ${outerColor} border-2 opacity-30`} style={{ animation: 'cosmicPulse 1.5s linear infinite' }}></div>
            <div className={`absolute h-5 w-5 rounded-full ${innerColor} border-2`} style={{ animation: 'reverseSpin 1s linear infinite' }}></div>
            <div className={`h-3 w-3 rounded-full ${outerColor} bg-current`} style={{ animation: 'cosmicBounce 1.5s ease infinite' }}></div>

            <style>{`
          @keyframes cosmicPulse {
            0% { transform: scale(0.8); opacity: 0.3; }
            50% { transform: scale(1.2); opacity: 0.5; }
            100% { transform: scale(0.8); opacity: 0.3; }
          }
          @keyframes reverseSpin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(-360deg); }
          }
          @keyframes cosmicBounce {
            0%, 100% { transform: translateY(-4px) scale(0.8); }
            50% { transform: translateY(4px) scale(1.2); }
          }
        `}</style>
        </div>
    );
}

export function QuantumDots({ dark }: { dark?: boolean }) {
    const dotColor = dark ? "bg-gray-300" : "bg-blue-500";
    const positions = [
        { x: -8, y: 0 },
        { x: -4, y: -6 },
        { x: 4, y: -6 },
        { x: 8, y: 0 },
        { x: 4, y: 6 },
        { x: -4, y: 6 },
    ];

    return (
        <div className="relative flex items-center justify-center h-12 w-12">
            {positions.map((pos, i) => (
                <div
                    key={i}
                    className={`absolute w-1.5 h-1.5 rounded-full ${dotColor}`}
                    style={{
                        animation: 'quantumFade 1.8s linear infinite',
                        transform: `translate(${pos.x}px, ${pos.y}px)`,
                        animationDelay: `${i * 0.3}s`,
                    }}
                ></div>
            ))}
            <div className={`w-2 h-2 rounded-full ${dotColor}`} style={{ animation: 'quantumPulse 1.8s ease-in-out infinite' }}></div>

            <style>{`
          @keyframes quantumFade {
            0%, 50%, 100% { opacity: 0.2; transform: translate3d(var(--tw-translate-x), var(--tw-translate-y), 0) scale(0.8); }
            25% { opacity: 1; transform: translate3d(var(--tw-translate-x), var(--tw-translate-y), 0) scale(1.2); }
          }
          @keyframes quantumPulse {
            0%, 100% { transform: scale(0.8); opacity: 0.2; }
            50% { transform: scale(1.5); opacity: 1; }
          }
        `}</style>
        </div>
    );
}

export function ElasticDots({ dark }: { dark?: boolean }) {
    const dotColor = dark ? "bg-gray-300" : "bg-blue-500";

    return (
        <div className="flex items-center justify-center gap-1 py-1 h-6">
            {[...Array(3)].map((_, i) => (
                <div
                    key={i}
                    className={`${dotColor} w-2 h-2 rounded-full`}
                    style={{
                        animation: 'elasticBounce 0.6s ease infinite alternate',
                        animationDelay: `${i * 0.1}s`,
                    }}
                ></div>
            ))}

            <style>{`
          @keyframes elasticBounce {
            0% {
              transform: translateY(0) scaleY(1);
            }
            40% {
              transform: translateY(-8px) scaleY(1.2);
            }
            80% {
              transform: translateY(2px) scaleY(0.8);
            }
            100% {
              transform: translateY(0) scaleY(1);
            }
          }
        `}</style>
        </div>
    );
}

export function WaveRipple({ dark }: { dark?: boolean }) {
    const color = dark ? "bg-gray-400" : "bg-blue-400";

    return (
        <div className="flex items-center justify-center py-1 h-6 overflow-hidden">
            {[...Array(6)].map((_, i) => (
                <div
                    key={i}
                    className={`${color} mx-0.5 h-full w-1 opacity-80`}
                    style={{
                        animation: 'waveRipple 1.2s ease-in-out infinite',
                        animationDelay: `${i * 0.1}s`
                    }}
                ></div>
            ))}
            <style>{`
          @keyframes waveRipple {
            0%, 100% { transform: scaleY(0.3); }
            50% { transform: scaleY(1); }
          }
        `}</style>
        </div>
    );
}

export function LoadingCircle({ dark, size }: { dark?: boolean; size?: number }) {
    const sizeClass = size ? `h-${size} w-${size}` : "h-10 w-10";

    return (
        <div className="flex items-center justify-center p-2">
            <div
                className={`animate-spin rounded-full ${sizeClass} border-t-4 border-b-4 ${dark ? "border-gray-500" : "border-blue-500"
                    } border-opacity-50`}
            ></div>
        </div>
    );
}

export function HorizontalProgressLoader({ dark }: { dark?: boolean }) {
    return (
        <div className="w-full h-1 overflow-hidden bg-gray-200 dark:bg-gray-700">
            <div
                className={`h-full ${dark ? "bg-gray-500" : "bg-blue-500"}`}
                style={{
                    animationName: 'progress',
                    animationDuration: '1.5s',
                    animationTimingFunction: 'ease-in-out',
                    animationIterationCount: 'infinite',
                }}
            />
            <style>{`
          @keyframes progress {
            0% { width: 0%; margin-left: 0; }
            50% { width: 100%; margin-left: 0; }
            100% { width: 0%; margin-left: 100%; }
          }
        `}</style>
        </div>
    );
}
export function ButtonShimmer({ dark }: { dark?: boolean }) {
    return (
        <div className="relative inline-flex items-center justify-center overflow-hidden">
            <div className="relative z-10 opacity-50">
                {/* This is where button content would normally go */}
                <span className="invisible">Button Content</span>
            </div>
            <div
                className="absolute inset-0 z-20"
                style={{
                    background: dark
                        ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)'
                        : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                    backgroundSize: '200% 100%',
                    animation: 'buttonShimmer 2s infinite'
                }}
            ></div>
            <style>{`
          @keyframes buttonShimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
        </div>
    );
}


export function ButtonPulse({ dark }: { dark?: boolean }) {
    const dotColor = dark ? "bg-gray-400" : "bg-blue-400";

    return (
        <div className="flex items-center justify-center space-x-1 py-1">
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} opacity-70`}
                style={{ animation: 'pulseOpacity 1.4s ease-in-out infinite', animationDelay: '0s' }} />
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} opacity-70`}
                style={{ animation: 'pulseOpacity 1.4s ease-in-out infinite', animationDelay: '0.2s' }} />
            <div className={`w-1.5 h-1.5 rounded-full ${dotColor} opacity-70`}
                style={{ animation: 'pulseOpacity 1.4s ease-in-out infinite', animationDelay: '0.4s' }} />
            <style>{`
          @keyframes pulseOpacity {
            0%, 100% { opacity: 0.3; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1); }
          }
        `}</style>
        </div>
    );
}

export function FadingBorder({ dark }: { dark?: boolean }) {
    const borderColor = dark ? "border-gray-500" : "border-blue-500";

    return (
        <div className="relative p-px w-full h-full">
            <div
                className={`absolute inset-0 border-2 rounded ${borderColor}`}
                style={{ animation: 'border-pulse 1.5s ease-in-out infinite' }}
            ></div>
            <style>{`
          @keyframes border-pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
        </div>
    );
}