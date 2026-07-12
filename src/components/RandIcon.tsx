import type { SVGProps, ForwardRefExoticComponent, RefAttributes } from "react";
import type { LucideProps } from "lucide-react";

type NavIconType = ForwardRefExoticComponent<Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>>;

export default function RandIcon({ size = 24, ...props }: { size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M7 21V3" />
      <path d="M7 3h5a4 4 0 0 1 0 8H7" />
      <path d="M11 11l5 10" />
      <path d="M4 8h10" />
      <path d="M4 12h8" />
    </svg>
  );
}

// Cast for use in nav arrays typed against Lucide icons
export const RandIconAsNav = RandIcon as unknown as NavIconType;
