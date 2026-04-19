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
 * `smooth` + small `wheel.step` = incremental zoom instead of harsh jumps.
 */
export function ZoomableImageViewport({ src, alt, className, imgClassName }: Props) {
  return (
    <div className={cn("relative flex h-full min-h-[200px] w-full touch-none items-stretch justify-stretch", className)}>
      <TransformWrapper
        initialScale={1}
        minScale={1}
        maxScale={6}
        centerOnInit
        centerZoomedOut
        limitToBounds
        smooth
        wheel={{
          step: 0.045,
          wheelDisabled: false,
          touchPadDisabled: false,
        }}
        pinch={{ step: 5 }}
        doubleClick={{ mode: "reset", step: 0.5, animationTime: 220, animationType: "easeOut" }}
        panning={{ velocityDisabled: false }}
      >
        <TransformComponent
          wrapperClass="!flex !h-full !w-full !items-center !justify-center"
          wrapperStyle={{ width: "100%", height: "100%" }}
          contentClass="!flex !h-full !w-full !items-center !justify-center"
          contentStyle={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%" }}
        >
          <img
            src={src}
            alt={alt}
            draggable={false}
            className={cn(
              "max-h-full max-w-full object-contain object-center select-none",
              "md:max-h-[min(78dvh,680px)]",
              imgClassName,
            )}
          />
        </TransformComponent>
      </TransformWrapper>
    </div>
  );
}
