import { Search } from "lucide-react";
import { IaeLogoFull } from "@/components/brand/IaeBrandMark";

function TextInput({ className = "" }: { className?: string }) {
  return <input className={`h-[37px] w-full border border-black bg-white px-2 text-sm outline-none ${className}`} />;
}

function SelectInput() {
  return <select className="h-[37px] w-full border border-black bg-white px-2 text-sm outline-none" />;
}

function SearchInput() {
  return (
    <label className="flex h-[36px] items-center gap-3 border border-neutral-500 px-3 text-neutral-500">
      <Search className="h-4 w-4" aria-hidden />
      <input className="w-full border-0 bg-transparent text-sm outline-none placeholder:text-neutral-500" placeholder="Enter an address" />
    </label>
  );
}

function AddressColumn({ title, contactLabel }: { title: string; contactLabel: string }) {
  return (
    <div className="min-w-0">
      <label className="block text-base leading-tight">{title} Location Name</label>
      <TextInput />
      <label className="mt-2 block text-base leading-tight">{title} Address</label>
      <TextInput />
      <span className="text-xs">Address Line 1</span>
      <TextInput />
      <span className="text-xs">Address Line 2</span>
      <div className="grid grid-cols-[1fr_1fr_0.52fr] gap-1">
        <TextInput />
        <SelectInput />
        <TextInput />
      </div>
      <div className="grid grid-cols-[1fr_1fr_0.52fr] gap-1 text-xs">
        <span>City</span>
        <span>State</span>
        <span>ZIP Code</span>
      </div>
      <label className="mt-2 block text-base leading-tight">{contactLabel}</label>
      <TextInput />
    </div>
  );
}

export function ShippingRequestsPage() {
  return (
    <div className="min-h-screen bg-white px-4 pb-10 text-black sm:px-6">
      <div className="mx-auto max-w-[720px]">
        <div className="flex justify-center pt-2">
          <IaeLogoFull height={168} surface="on-light" />
        </div>

        <form className="border border-black px-3 pb-5 pt-3 sm:px-4">
          <h1 className="mb-7 text-center text-[28px] font-normal leading-tight">IAE Internal Shipping Requests</h1>

          <label className="block text-base leading-tight">REQUESTOR Name*</label>
          <div className="mb-2 border border-red-500 bg-red-50 px-2 py-1 text-xs text-red-700">
            <span className="mr-2 inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">!</span>
            Required field
          </div>
          <SelectInput />

          <label className="mt-3 block text-base leading-tight">SHIP FROM Company/Venue Address Search</label>
          <SearchInput />

          <label className="mt-3 block text-base leading-tight">SHIP TO Company/Venue Address Search</label>
          <SearchInput />

          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <AddressColumn title="SHIP FROM" contactLabel="SHIP FROM - Contact Name*" />
            <AddressColumn title="SHIP TO" contactLabel="SHIP TO - ATTN TO*" />
          </div>

          <hr className="my-4 border-neutral-300" />

          <fieldset>
            <legend className="text-base">Does anyone need to be notified with tracking updates?*</legend>
            <div className="mt-2 flex gap-4 text-sm">
              <label className="inline-flex items-center gap-1"><input type="radio" name="tracking" /> Yes</label>
              <label className="inline-flex items-center gap-1"><input type="radio" name="tracking" /> No</label>
            </div>
          </fieldset>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="block text-base leading-tight">What day will the boxes be ready for PICK UP?*</span>
              <input type="date" className="h-[35px] w-full border border-black px-2 text-sm outline-none" />
            </label>
            <label className="block">
              <span className="block text-base leading-tight">What day does the package need to arrive by?*</span>
              <input type="date" className="h-[35px] w-full border border-black px-2 text-sm outline-none" />
            </label>
          </div>

          <label className="mt-3 block text-base leading-tight">How many boxes in the shipment?*</label>
          <SelectInput />

          <hr className="my-4 border-neutral-300" />

          <fieldset>
            <legend className="text-base">Does this package need to be shipped anywhere else after this destination?*</legend>
            <div className="mt-2 flex flex-wrap gap-3 text-sm">
              <label className="inline-flex items-center gap-1"><input type="radio" name="destination" /> No</label>
              <label className="inline-flex items-center gap-1"><input type="radio" name="destination" /> Yes, Send back to IAE HQ</label>
              <label className="inline-flex items-center gap-1"><input type="radio" name="destination" /> Yes, Send to Another Destination</label>
            </div>
          </fieldset>

          <div className="mt-12 text-center">
            <button type="button" className="bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-800">Submit Form</button>
          </div>
        </form>
      </div>
    </div>
  );
}
