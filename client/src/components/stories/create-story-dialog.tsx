import { useState, useRef } from "react";
import { toast } from "sonner";
import { ImagePlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useStoryStore } from "@/stores/story.store";
import api from "@/lib/api";

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = [
  "#2563EB", "#6366F1", "#059669", "#DC2626",
  "#F59E0B", "#8B5CF6", "#EC4899", "#0891B2",
];

export function CreateStoryDialog({ open, onOpenChange }: CreateStoryDialogProps) {
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState(COLORS[0]);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const loadStories = useStoryStore((s) => s.loadStories);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePost = async (type: "TEXT" | "IMAGE") => {
    setPosting(true);
    try {
      if (type === "TEXT") {
        if (!text.trim()) { toast.error("Enter some text"); setPosting(false); return; }
        await api.post("/stories", { type: "TEXT", content: text.trim(), backgroundColor: bgColor });
      } else {
        if (!imageFile) { toast.error("Select an image"); setPosting(false); return; }
        const formData = new FormData();
        formData.append("file", imageFile);
        const uploadRes = await api.post("/uploads", formData);
        await api.post("/stories", { type: "IMAGE", mediaUrl: uploadRes.data.url });
      }
      toast.success("Story posted!");
      await loadStories();
      onOpenChange(false);
      setText("");
      setImageFile(null);
      setImagePreview(null);
    } catch {
      toast.error("Failed to post story");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-heading">Create Story</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="text">
          <TabsList className="w-full">
            <TabsTrigger value="text" className="flex-1">Text</TabsTrigger>
            <TabsTrigger value="image" className="flex-1">Image</TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4 mt-4">
            <div
              className="rounded-xl p-6 min-h-[200px] flex items-center justify-center"
              style={{ backgroundColor: bgColor }}
            >
              <Textarea
                placeholder="What's on your mind?"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="bg-transparent border-none text-white text-lg text-center placeholder:text-white/50 resize-none focus-visible:ring-0"
              />
            </div>
            <div className="flex gap-2 justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  className="h-8 w-8 rounded-full border-2 transition-transform"
                  style={{
                    backgroundColor: c,
                    borderColor: c === bgColor ? "white" : "transparent",
                    transform: c === bgColor ? "scale(1.15)" : "scale(1)",
                    boxShadow: c === bgColor ? "0 0 0 2px " + c : "none",
                  }}
                  onClick={() => setBgColor(c)}
                />
              ))}
            </div>
            <Button className="w-full" onClick={() => handlePost("TEXT")} disabled={posting}>
              {posting ? "Posting..." : "Post Story"}
            </Button>
          </TabsContent>

          <TabsContent value="image" className="space-y-4 mt-4">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            {imagePreview ? (
              <img src={imagePreview} alt="Preview" className="rounded-xl max-h-64 w-full object-cover" />
            ) : (
              <button
                className="flex flex-col items-center justify-center gap-2 w-full h-48 rounded-xl border-2 border-dashed border-muted-foreground/30 text-muted-foreground hover:border-primary/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <ImagePlus className="h-8 w-8" />
                <span className="text-sm">Click to select an image</span>
              </button>
            )}
            <Button className="w-full" onClick={() => handlePost("IMAGE")} disabled={posting}>
              {posting ? "Posting..." : "Post Story"}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
