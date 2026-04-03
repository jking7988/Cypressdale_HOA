export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import ResidentYardSaleMap from "@/components/ResidentYardSaleMap";
import { isYardSaleMapActive } from "@/lib/yardSale";

export default function CommunityMapPage() {
  if (!isYardSaleMapActive) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <ResidentYardSaleMap
        showQrCard
        mapPath="/map"
        title="Community Yard Sale Map"
        subtitle="Add your pin with street number + street name, plus optional hours and notes."
      />
    </div>
  );
}
