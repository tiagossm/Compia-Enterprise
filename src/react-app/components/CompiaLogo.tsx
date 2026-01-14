import './CompiaLogo.css';

interface CompiaLogoProps {
    blocks?: boolean; // If true, render as block (for login). If false, fits in header.
    size?: number; // Size of the symbol in px
    textSize?: number; // Size of text in px
    className?: string;
}

export default function CompiaLogo({ size = 36, textSize = 22, className = '' }: CompiaLogoProps) {
    return (
        <div className={`compia-logo-container ${className}`}>
            <div className="compia-symbol" style={{ width: size, height: size }}>
                <img
                    src="/compia_logo.png"
                    alt="Compia Logo"
                    style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                    }}
                />
            </div>

            <div className="compia-logotype" style={{ fontSize: textSize }}>
                Compia
            </div>
        </div>
    );
}
