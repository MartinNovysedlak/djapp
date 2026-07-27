"use client";

import { use } from "react";
import { RequirementTemplateEditor } from "@/components/templates/RequirementTemplateEditor";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function RequirementTemplateEditPage({ params }: PageProps) {
  const { id } = use(params);
  return (
    <div className="p-6 md:p-10">
      <RequirementTemplateEditor templateId={id} />
    </div>
  );
}
