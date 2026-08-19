

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" >
      
      <body>
        <div>{children}</div>

        
      </body>
    </html>
  );
}
