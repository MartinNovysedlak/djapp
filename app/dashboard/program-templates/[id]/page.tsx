"use client";

import { use } from "react";
import { ProgramTemplateEditor } from "@/components/templates/ProgramTemplateEditor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function ProgramTemplateEditPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <div className="p-6 md:p-10">
      <ProgramTemplateEditor templateId={id} />
    </div>
  );
}
