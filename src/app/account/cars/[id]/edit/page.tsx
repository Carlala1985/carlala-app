import { notFound } from "next/navigation";
import { getDict } from "@/lib/i18n";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { CarForm } from "@/components/CarForm";
import { deletePhoto, saveCar } from "@/app/actions/cars";
import { carFormErrors, carOptions } from "@/lib/options";
import { blobMode, MAX_PHOTOS } from "@/lib/uploads";

export default async function EditCar({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/account/cars/${id}/edit`);
  const car = await db.car.findUnique({ where: { id }, include: { photos: { orderBy: { position: "asc" } } } });
  if (!car || car.ownerId !== user.id) notFound();
  const { t } = await getDict();
  return (
    <div className="wrap max-w-[820px] py-10">
      <h1 className="mb-6 text-4xl font-extrabold">{t.carForm.editTitle}</h1>
      {car.photos.length > 0 && (
        <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {car.photos.map((p) => (
            <li key={p.id} className="card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-[4/3] w-full object-cover" />
              <form action={deletePhoto} className="p-2"><input type="hidden" name="photoId" value={p.id} />
                <button className="text-sm font-semibold text-err">{t.carForm.removePhoto}</button></form>
            </li>
          ))}
        </ul>
      )}
      <CarForm action={saveCar} labels={t.carForm} errors={carFormErrors(t)} options={carOptions(t)}
        photoRoom={MAX_PHOTOS - car.photos.length} uploadMode={blobMode()}
        car={{ ...car, pricePerHour: car.pricePerHour / 100, pricePerDay: car.pricePerDay / 100 }} />
    </div>
  );
}
