type MeetAvatarProps = {
  name: string;
  size: number;
};

export function MeetAvatar({ name, size }: MeetAvatarProps) {
  const initials =
    name
      .split(/\s+/)
      .map((segment) => segment[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?";

  return (
    <div className="meet-avatar" style={{ width: size, height: size, fontSize: size * 0.36 }} aria-hidden>
      {initials}
    </div>
  );
}
