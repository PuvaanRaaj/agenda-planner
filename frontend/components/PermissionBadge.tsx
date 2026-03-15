type Props = {
  role: string;
};

export default function PermissionBadge({ role }: Props) {
  return (
    <span className="inline-flex rounded-full border border-[#2a2a2a] px-2 py-0.5 text-[10px] font-medium text-[#666]">
      {role}
    </span>
  );
}
