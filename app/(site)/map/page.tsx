export const dynamic = "force-dynamic";

import ResidentYardSaleMap from "@/components/ResidentYardSaleMap";

export default function CommunityMapPage() {
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
