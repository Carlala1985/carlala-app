import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { CarForm } from "@/components/CarForm";
import { saveCar } from "@/app/actions/cars";
import { carFormErrors, carOptions } from "@/lib/options";

export default async function NewCar() {
  await requireUser("/account/cars/new");
  const { t } = await getDict();
  return (
    <div className="wrap max-w-[820px] py-10">
      <h1 className="mb-6 text-4xl font-extrabold">{t.carForm.newTitle}</h1>
      <CarForm action={saveCar} labels={t.carForm} errors={carFormErrors(t)} options={carOptions(t)} canAddPhotos />
    </div>
  );
}
