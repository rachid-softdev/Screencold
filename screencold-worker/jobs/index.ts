/**
 * Job Functions Export
 * Re-exports all job functions for use by the processor
 */

// Capture job
export {
  captureWebsite,
  captureWebsite as capture,
  isCaptureValid,
  type CaptureResult,
} from "./capture";

// Upload jobs
export {
  uploadScreenshots,
  uploadScreenshots as upload,
  uploadAnnotatedScreenshot,
  uploadAnnotatedScreenshot as uploadAnnotated,
  type UploadResult,
} from "./upload";

// Analysis job
export {
  analyzeSite,
  analyzeSite as analyze,
  isAnalysisValid,
  type AnalysisResult,
} from "./analyze";

// Annotation job
export {
  annotateScreenshot,
  annotateScreenshot as annotate,
  type AnnotationResult,
} from "./annotate";

// Email generation job
export {
  generateOutreachEmail,
  generateOutreachEmail as generateEmail,
  insertImagePlaceholder,
  isEmailValid,
  type EmailGenerationResult,
} from "./generate-email";