import { MapPinIcon } from "@/components/icons";

type PersonalInfoFormProps = {
  name: string;
  preferredName: string;
  city: string;
  onChangeName: (value: string) => void;
  onChangePreferredName: (value: string) => void;
  onChangeCity: (value: string) => void;
};

export default function PersonalInfoForm({
  name,
  preferredName,
  city,
  onChangeName,
  onChangePreferredName,
  onChangeCity,
}: PersonalInfoFormProps) {
  return (
    <div className="mt-6 flex flex-col gap-5">
      <div>
        <label htmlFor="profile-name" className="text-sm font-semibold text-slate-800">
          Nombre
        </label>
        <input
          id="profile-name"
          type="text"
          value={name}
          onChange={(event) => onChangeName(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inset-control transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div>
        <label htmlFor="profile-preferred-name" className="text-sm font-semibold text-slate-800">
          Nombre preferido <span className="font-normal text-slate-400">(opcional)</span>
        </label>
        <p className="mt-0.5 text-sm text-slate-500">¿Cómo te gustaría que te llame SENDA?</p>
        <input
          id="profile-preferred-name"
          type="text"
          value={preferredName}
          onChange={(event) => onChangePreferredName(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-inset-control transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
        />
      </div>

      <div>
        <label htmlFor="profile-city" className="text-sm font-semibold text-slate-800">
          Ciudad
        </label>
        <div className="relative mt-2">
          <MapPinIcon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-teal-600" />
          <input
            id="profile-city"
            type="text"
            value={city}
            onChange={(event) => onChangeCity(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-base text-slate-900 shadow-inset-control transition focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
        </div>
      </div>
    </div>
  );
}
