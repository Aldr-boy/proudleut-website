export default function StudioLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <div className="h-full min-h-0">{children}</div>;
}
