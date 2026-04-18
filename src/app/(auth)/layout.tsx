export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Osci<span className="text-primary">scoops</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Learn synths. Make sounds. Have fun.</p>
      </div>
      {children}
    </div>
  );
}
