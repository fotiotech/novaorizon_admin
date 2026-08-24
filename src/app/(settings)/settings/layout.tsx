// app/settings/layout.tsx

import SettingLayout from "../components/SettingLayout";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <SettingLayout>{children}</SettingLayout>
      </body>
    </html>
  );
}
