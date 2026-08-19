"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useSignals } from "@/hooks/useSignals";
import { generateLocalId } from "@/lib/localId";
import { SIGNAL_TYPE_CATEGORY, type Report } from "@/lib/reports";
import ConfirmStep from "./ConfirmStep";
import DetailsStep from "./DetailsStep";
import LocationStep from "./LocationStep";
import StepIndicator from "./StepIndicator";
import { EMPTY_REPORT_DRAFT, type ReportDraft } from "./types";
import WizardHeader from "./WizardHeader";

// Wizard de una única señalización controlado por estado interno (step
// 1/2/3), dentro de una sola ruta (/reportar). El borrador se conserva en
// memoria al avanzar/retroceder; recién se crea/actualiza una señalización
// real en la colección centralizada (useSignals) al presionar "Enviar
// señalización".
//
// Modo edición: si la URL trae ?edit=<id> de una señalización propia, el
// mismo flujo de 3 pasos se reutiliza para editarla en vez de crear una
// nueva (ver SignalDetailSheet → "Editar señalización"). No hay un
// formulario separado para editar. useSignals().editSignal ya valida
// propiedad (isOwner) antes de escribir, así que aunque alguien manipule
// la URL con el id de una señalización ajena, no hay forma de modificarla
// desde acá.
export default function ReportWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const { signals, currentUserId, addReport, editSignal, isLoaded } = useSignals();
  const editingSignal = editId ? (signals.find((signal) => signal.id === editId) ?? null) : null;
  const canRender = !editId || isLoaded;

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [draft, setDraft] = useState<ReportDraft>(EMPTY_REPORT_DRAFT);

  useEffect(() => {
    if (!editId || !isLoaded) return;
    if (editingSignal && editingSignal.isOwner) {
      // Hidratación única del borrador a partir de una señalización ya
      // guardada (localStorage, carga asíncrona): mismo patrón —y misma
      // limitación de la regla del linter para "sincronizar con un
      // sistema externo"— que useLocalStorageState.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setDraft({
        latitude: editingSignal.latitude,
        longitude: editingSignal.longitude,
        address: editingSignal.address,
        locationMethod: null,
        signalType: editingSignal.type,
        seenOption: null,
        seenAt: editingSignal.seenAt,
        photo: editingSignal.photo,
        description: editingSignal.description,
      });
    }
    // Solo debe hidratar una vez, al entrar en modo edición: no queremos
    // pisar los cambios del usuario si signals vuelve a cambiar mientras
    // completa el formulario.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId, isLoaded]);

  function handleBack() {
    if (step === 1) {
      router.push("/reportes");
      return;
    }
    setStep((current) => (current === 3 ? 2 : 1));
  }

  function handleLocationNext(
    patch: Pick<ReportDraft, "latitude" | "longitude" | "address" | "locationMethod">
  ) {
    setDraft((current) => ({ ...current, ...patch }));
    setStep(2);
  }

  function handleDetailsNext(
    patch: Pick<ReportDraft, "signalType" | "seenOption" | "seenAt" | "photo" | "description">
  ) {
    setDraft((current) => ({ ...current, ...patch }));
    setStep(3);
  }

  function handleSubmit() {
    if (draft.latitude === null || draft.longitude === null || !draft.signalType || !draft.seenAt) {
      return;
    }

    if (editId) {
      editSignal(editId, {
        category: SIGNAL_TYPE_CATEGORY[draft.signalType],
        type: draft.signalType,
        latitude: draft.latitude,
        longitude: draft.longitude,
        address: draft.address,
        seenAt: draft.seenAt,
        description: draft.description.trim(),
        photo: draft.photo,
      });
      router.push("/reportes");
      return;
    }

    if (!currentUserId) return;

    const report: Report = {
      id: generateLocalId(),
      userId: currentUserId,
      category: SIGNAL_TYPE_CATEGORY[draft.signalType],
      type: draft.signalType,
      latitude: draft.latitude,
      longitude: draft.longitude,
      address: draft.address,
      seenAt: draft.seenAt,
      description: draft.description.trim(),
      photo: draft.photo,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deletedAt: null,
      status: "new",
      confirmations: 0,
      resolvedConfirmations: 0,
    };

    addReport(report);
    router.push("/reportes");
  }

  if (!canRender) return null;

  return (
    <div className="flex flex-col gap-5">
      <WizardHeader onBack={handleBack} title={editId ? "Editar señalización" : "Crear señalización"} />
      <StepIndicator step={step} />

      {step === 1 && <LocationStep draft={draft} onNext={handleLocationNext} />}
      {step === 2 && <DetailsStep draft={draft} onNext={handleDetailsNext} />}
      {step === 3 && (
        <ConfirmStep draft={draft} onEditStep={setStep} onSubmit={handleSubmit} />
      )}
    </div>
  );
}
