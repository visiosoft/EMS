import { Heart, Sparkles, ExternalLink } from "lucide-react";
import { useLocation } from "react-router-dom";

/**
 * Elegant "Developed by NKU Technologies" watermark footer.
 * Adapts to the Internal/Hub (black footer) vs EMS (theme-aware) contexts.
 */
export default function PoweredByWatermark() {
  const { pathname } = useLocation();
  const isHub = pathname.startsWith("/internal");

  return (
    <footer className={`nku-wm${isHub ? " nku-wm--hub" : ""}`} id="nku-watermark-footer">
      {/* Animated gradient separator line */}
      <div className="nku-wm__ruler" aria-hidden="true" />

      <div className="nku-wm__row">
        <span className="nku-wm__label">
          Developed by
        </span>

        <a
          href="https://nkutechnologies.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="nku-wm__badge"
          id="nku-watermark-link"
        >
          <span className="nku-wm__name">NKU Technologies</span>
          <span className="nku-wm__suffix">(Pvt) Ltd</span>
          <ExternalLink size={10} className="nku-wm__arrow" />
        </a>

        <span className="nku-wm__divider" aria-hidden="true" />

        <span className="nku-wm__made">
          Made with{" "}
          <span className="nku-wm__heart-box">
            <Heart size={12} className="nku-wm__heart" fill="currentColor" />
          </span>
          {" "}&amp; a sprinkle of{" "}
          <span className="nku-wm__sparkle-box">
            <Sparkles size={12} className="nku-wm__sparkle" />
          </span>
          {" "}magic
        </span>
      </div>
    </footer>
  );
}
