import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  /** Outer wrapper (fixed viewport size). */
  className?: string;
  /** Classes on the <img>. */
  imgClassName?: string;
};

/**
 * Pinch, scroll wheel / trackpad, and drag-to-pan when zoomed — used in lightboxes and the chat image viewer.
 */
export function ZoomableImageViewport({ src, alt, className, imgClassName }: Props) {
  return (
    <div className={cn("relative w-full min-h-[200px] touch-none", className)}>
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={5}
        centerOnInit
        limitToBounds
        wheel={{ step: 0.12 }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "reset", step: 0.7 }}
        panning={{ velocityDisabled: false }}
      >
        <TransformComponent
          wrapperClass="!w-full !h-full flex items-center justify-center"
          contentClass="!flex !items-center !justify-center"
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className={cn(
              "max-h-[min(85dvh,720px)] w-auto max-w-full object-contain select-none",
              imgClassName,
            )}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
