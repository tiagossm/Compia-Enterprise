// UserAvatar component with initials fallback

interface UserAvatarProps {
    name?: string;
    avatarUrl?: string;
    size?: 'xs' | 'sm' | 'md' | 'lg';
    className?: string;
}

const sizeClasses = {
    xs: 'w-5 h-5 text-[10px]',
    sm: 'w-7 h-7 text-xs',
    md: 'w-9 h-9 text-sm',
    lg: 'w-11 h-11 text-base'
};

/**
 * Generates initials from a name (first + last letter of last word)
 */
function getInitials(name?: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
        return parts[0].charAt(0).toUpperCase();
    }
    const first = parts[0].charAt(0).toUpperCase();
    const last = parts[parts.length - 1].charAt(0).toUpperCase();
    return first + last;
}

/**
 * Generates a consistent color based on the name
 */
function getColorFromName(name?: string): string {
    const colors = [
        'bg-blue-500',
        'bg-emerald-500',
        'bg-purple-500',
        'bg-amber-500',
        'bg-rose-500',
        'bg-cyan-500',
        'bg-indigo-500',
        'bg-teal-500',
    ];

    if (!name) return colors[0];

    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }

    return colors[Math.abs(hash) % colors.length];
}

export default function UserAvatar({
    name,
    avatarUrl,
    size = 'md',
    className = ''
}: UserAvatarProps) {
    const initials = getInitials(name);
    const bgColor = getColorFromName(name);
    const sizeClass = sizeClasses[size];

    if (avatarUrl) {
        return (
            <img
                src={avatarUrl}
                alt={name || 'User'}
                className={`${sizeClass} rounded-full object-cover ring-2 ring-white ${className}`}
                onError={(e) => {
                    // Fallback to initials if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
            />
        );
    }

    return (
        <div
            className={`${sizeClass} ${bgColor} rounded-full flex items-center justify-center text-white font-semibold ring-2 ring-white ${className}`}
            title={name}
        >
            {initials}
        </div>
    );
}

/**
 * Avatar group component for displaying multiple users
 */
interface UserAvatarGroupProps {
    users: Array<{ name?: string; avatarUrl?: string }>;
    max?: number;
    size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function UserAvatarGroup({ users, max = 3, size = 'sm' }: UserAvatarGroupProps) {
    const visible = users.slice(0, max);
    const remaining = users.length - max;

    return (
        <div className="flex -space-x-2">
            {visible.map((user, index) => (
                <UserAvatar
                    key={index}
                    name={user.name}
                    avatarUrl={user.avatarUrl}
                    size={size}
                />
            ))}
            {remaining > 0 && (
                <div
                    className={`${sizeClasses[size]} bg-slate-200 text-slate-600 rounded-full flex items-center justify-center font-semibold ring-2 ring-white`}
                >
                    +{remaining}
                </div>
            )}
        </div>
    );
}
