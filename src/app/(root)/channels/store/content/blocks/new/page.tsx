// app/content-management/blocks/[id]/page.tsx

import BlockForm from "../_component/BlockForm";

export default async function BlockNewPage() {
  return <BlockForm />;
}

export const metadata = {
  title: "New block",
};
