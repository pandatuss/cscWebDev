import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from "react";
import { toast } from "sonner";
import { Upload, Bold, Italic, List, ListOrdered, Heading2, Image } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadAsset } from "@/lib/storage.functions";

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-success text-success-foreground hover:bg-success",
    scheduled: "bg-primary text-primary-foreground hover:bg-primary",
    draft: "bg-secondary text-secondary-foreground hover:bg-secondary",
  };
  return (
    <Badge className={map[status] ?? map["draft"]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export function TippedButton({
  label,
  children,
  ...buttonProps
}: ComponentProps<typeof Button> & { label: string }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button aria-label={label} {...buttonProps}>
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ConfirmAction({
  trigger,
  title,
  description,
  confirmLabel = "Delete",
  tipLabel,
  onConfirm,
}: {
  trigger: ReactNode;
  title: string;
  description: string;
  confirmLabel?: string;
  tipLabel?: string;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
          </TooltipTrigger>
          {tipLabel ? <TooltipContent side="top">{tipLabel}</TooltipContent> : null}
        </Tooltip>
      </TooltipProvider>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={() => void onConfirm()}>{confirmLabel}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function toBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

export function FileUploader({
  kind,
  label,
  accept,
  onUploaded,
}: {
  kind: "media" | "documents";
  label: string;
  accept: string;
  onUploaded: (result: { url: string; fileName: string; fileSize: number }) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File) {
    setBusy(true);
    try {
      const dataBase64 = await toBase64(file);
      const result = await uploadAsset({
        data: { kind, fileName: file.name, contentType: file.type, dataBase64 },
      });
      onUploaded(result);
      toast.success("File uploaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        id={`upload-${kind}-${label}`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mr-1 size-4" /> {busy ? "Uploading…" : label}
      </Button>
    </div>
  );
}

const TOOLS = [
  { label: "Heading", icon: Heading2, command: "formatBlock", arg: "h3" },
  { label: "Bold", icon: Bold, command: "bold" },
  { label: "Italic", icon: Italic, command: "italic" },
  { label: "Bulleted list", icon: List, command: "insertUnorderedList" },
  { label: "Numbered list", icon: ListOrdered, command: "insertOrderedList" },
] as const;

export function RichTextEditor({
  value,
  onChange,
  id = "content",
}: {
  value: string;
  onChange: (next: string) => void;
  id?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const lastEmitted = useRef<string | null>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastEmitted.current) return;
    if (editor.innerHTML !== value) editor.innerHTML = value ?? "";
    lastEmitted.current = value;
  }, [value]);

  function sync() {
    const editor = editorRef.current;
    if (!editor) return;
    const html = editor.innerHTML;
    lastEmitted.current = html;
    onChange(html);
  }

  function exec(command: string, arg?: string) {
    editorRef.current?.focus();
    document.execCommand(command, false, arg);
    sync();
  }

  async function handleImage(file: File) {
    setUploading(true);
    try {
      const dataBase64 = await toBase64(file);
      const result = await uploadAsset({
        data: { kind: "media", fileName: file.name, contentType: file.type, dataBase64 },
      });
      exec("insertImage", result.url);
      toast.success("Image inserted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-border bg-secondary/60 p-2">
        {TOOLS.map((tool) => (
          <TippedButton
            key={tool.label}
            label={tool.label}
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => exec(tool.command, "arg" in tool ? tool.arg : undefined)}
          >
            <tool.icon className="size-4" />
          </TippedButton>
        ))}
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImage(file);
          }}
        />
        <TippedButton
          label={uploading ? "Uploading…" : "Insert image"}
          type="button"
          variant="ghost"
          size="icon"
          disabled={uploading}
          onClick={() => imageInputRef.current?.click()}
        >
          <Image className="size-4" />
        </TippedButton>
      </div>
      <Label htmlFor={id} className="sr-only">
        Content
      </Label>
      <div
        id={id}
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-multiline="true"
        data-placeholder="Write the announcement here…"
        onInput={sync}
        suppressContentEditableWarning
        dir="ltr"
        className="min-h-56 w-full rounded-b-lg border border-t-0 border-border bg-background px-3 py-2 text-left text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring empty:before:text-muted-foreground empty:before:content-[attr(data-placeholder)] [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-2 [&_img]:max-w-full [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6"
      />
      <p className="mt-1.5 text-xs text-muted-foreground">
        Format text like a word document. Anything unsafe is stripped before publishing.
      </p>
    </div>
  );
}
