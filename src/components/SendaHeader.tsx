import { BellIcon } from "./icons";

export default function SendaHeader() {
  return (
    <div className="flex items-center justify-between">
      <div className="text-[32px] font-extrabold leading-none tracking-tight text-slate-950 sm:text-[46px]">
        SEND<span className="text-lime-400">A</span>
      </div>
      {/* Puramente decorativo: no existe un sistema de notificaciones en
          SENDA todavía. Solo visible en mobile, tal como en la referencia
          (senda-mobile-reference.png); el mockup de escritorio no lo tiene. */}
      <span aria-hidden="true" className="text-slate-900 sm:hidden">
        <BellIcon className="h-6 w-6" />
      </span>
    </div>
  );
}
