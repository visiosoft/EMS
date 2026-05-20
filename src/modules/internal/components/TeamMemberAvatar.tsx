import { cn } from '@/lib/utils';

export const TEAM_MEMBER_AVATAR_SRC = '/team-member-avatar.svg-1.jpg';

type TeamMemberAvatarProps = {
  className?: string;
  alt?: string;
};

export function TeamMemberAvatar({ className, alt = '' }: TeamMemberAvatarProps) {
  return (
    <img
      src={TEAM_MEMBER_AVATAR_SRC}
      alt={alt}
      className={cn('block h-10 w-10 object-cover shadow-sm', className)}
      loading="lazy"
    />
  );
}
