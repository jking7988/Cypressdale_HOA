export const dynamic = "force-dynamic";

import ResidentYardSaleMap from "@/components/ResidentYardSaleMap";

export default function CommunityMapPage() {
  return (
    <div className="space-y-4">
      <ResidentYardSaleMap
        readOnly
        showQrCard
        mapPath="/map"
        title="Community Yard Sale Map"
        subtitle="Scan the QR or share this page. Tap pins for details and export addresses to Google or Apple Maps."
      />
    </div>
  );
}

