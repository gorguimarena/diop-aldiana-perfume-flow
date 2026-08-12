import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

type ImageUploadProps = {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
};

export function ImageUpload({ value, onChange, label = "Image" }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const configured = Boolean(CLOUD_NAME && UPLOAD_PRESET);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (!configured) {
      toast.error("Cloudinary non configuré (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET)");
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Fichier image requis");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image trop lourde (max 5 Mo)");
      return;
    }

    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("upload_preset", UPLOAD_PRESET!);

      const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
        method: "POST",
        body,
      });
      const json = (await res.json()) as { secure_url?: string; error?: { message?: string } };
      if (!res.ok || !json.secure_url) {
        const msg = json.error?.message ?? "Échec de l'upload Cloudinary";
        if (/preset not found/i.test(msg)) {
          throw new Error(
            "Upload preset introuvable. Dans .env, VITE_CLOUDINARY_UPLOAD_PRESET doit être le NOM du preset (ex. diop_aldiana), pas l'API secret.",
          );
        }
        if (/whitelisted for unsigned|unsigned uploads/i.test(msg)) {
          throw new Error(
            "Le preset Cloudinary n'est pas en mode Unsigned. Dans Cloudinary → Settings → Upload → Upload presets → ouvre ton preset → Signing mode = Unsigned → Save.",
          );
        }
        throw new Error(msg);
      }
      onChange(json.secure_url);
      toast.success("Image uploadée");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload impossible");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {!configured && (
        <p className="text-xs text-warning">
          Ajoutez VITE_CLOUDINARY_CLOUD_NAME et VITE_CLOUDINARY_UPLOAD_PRESET dans .env
        </p>
      )}
      {value ? (
        <div className="relative w-full aspect-[4/3] overflow-hidden rounded-md border border-border/60 bg-muted/30">
          <img src={value} alt="" className="h-full w-full object-cover" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={() => onChange(null)}
            disabled={uploading}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          disabled={uploading || !configured}
          onClick={() => inputRef.current?.click()}
          className="flex w-full aspect-[4/3] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border/70 bg-muted/20 text-muted-foreground hover:border-gold/50 hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin" />
          ) : (
            <ImagePlus className="h-6 w-6" />
          )}
          <span className="text-xs">{uploading ? "Upload…" : "Choisir une image"}</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      {value && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading || !configured}
          onClick={() => inputRef.current?.click()}
        >
          Remplacer
        </Button>
      )}
    </div>
  );
}
