import os
import cv2
import numpy as np
from insightface.app import FaceAnalysis
import pickle
from PIL import Image, ImageDraw, ImageFont, ImageEnhance
import json
import sys

# Define Paths
TEST_FOLDER = "test-images"
OUTPUT_FOLDER = "output"
EMBEDDINGS_FILE = "face_embeddings.pkl"

def main():
    try:
        # Ensure directories exist
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)

        # Check if embeddings file exists
        if not os.path.exists(EMBEDDINGS_FILE):
            print("Error: face_embeddings.pkl not found. Please run training first.")
            sys.exit(1)

        # Load stored face embeddings
        with open(EMBEDDINGS_FILE, "rb") as f:
            known_faces = pickle.load(f)

        if not known_faces:
            print("Error: No trained faces found in embeddings file.")
            sys.exit(1)

        # Normalize all embeddings
        for name in known_faces:
            known_faces[name] = known_faces[name] / np.linalg.norm(known_faces[name])

        # Initialize Face Recognition Model
        app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
        app.prepare(ctx_id=0, det_size=(640, 640))

        # Check if test folder exists
        if not os.path.exists(TEST_FOLDER):
            print(f"Error: Test folder '{TEST_FOLDER}' not found.")
            sys.exit(1)

        # Process results
        all_detections = []
        total_faces = 0
        recognized_students = set()
        confidence_scores = []

        # Get all image files
        image_files = [f for f in os.listdir(TEST_FOLDER) 
                      if f.lower().endswith(('.jpg', '.jpeg', '.png'))]
        
        if not image_files:
            print("Error: No valid image files found in test folder.")
            sys.exit(1)

        # Process each image
        for idx, image_name in enumerate(sorted(image_files)):
            image_path = os.path.join(TEST_FOLDER, image_name)
            detections = process_single_image(image_path, known_faces, app, idx)
            
            if detections:
                all_detections.extend(detections)
                for detection in detections:
                    total_faces += 1
                    if detection['studentId']:
                        recognized_students.add(detection['studentId'])
                        confidence_scores.append(detection['confidence'])

        # Calculate average confidence
        avg_confidence = np.mean(confidence_scores) if confidence_scores else 0.0

        # Prepare results
        results = {
            "totalFaces": total_faces,
            "recognizedStudents": list(recognized_students),
            "averageConfidence": float(avg_confidence),
            "detections": all_detections
        }

        # Output JSON results for Node.js to parse
        print(json.dumps(results))

    except Exception as e:
        error_result = {
            "error": str(e),
            "totalFaces": 0,
            "recognizedStudents": [],
            "averageConfidence": 0.0,
            "detections": []
        }
        print(json.dumps(error_result))
        sys.exit(1)

def process_single_image(image_path, known_faces, app, image_index):
    """Process a single image and return detection results"""
    detections = []
    
    try:
        img = cv2.imread(image_path)
        if img is None or img.shape[0] == 0 or img.shape[1] == 0:
            return detections

        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        pil_original = Image.fromarray(img_rgb)

        # Enhanced version for better detection
        pil_enhanced = pil_original.copy()
        pil_enhanced = ImageEnhance.Brightness(pil_enhanced).enhance(1.2)
        pil_enhanced = ImageEnhance.Contrast(pil_enhanced).enhance(1.5)
        pil_enhanced = ImageEnhance.Sharpness(pil_enhanced).enhance(2.0)

        detection_img = np.array(pil_enhanced)
        faces = app.get(detection_img)

        # Fallback: Try original if no faces found
        if len(faces) == 0:
            faces = app.get(np.array(pil_original))

        # Track recognized names in this image to avoid duplicates
        recognized_in_image = set()

        # Process each detected face
        for face_idx, face in enumerate(faces):
            bbox = face.bbox.astype(int).tolist()

            # Normalize embedding
            embedding = face.normed_embedding
            embedding = embedding / np.linalg.norm(embedding)

            # Find best match
            best_match = None
            best_similarity = 0.0
            confidence_threshold = 0.40

            for name, known_emb in known_faces.items():
                similarity = cosine_similarity(embedding, known_emb)
                if (similarity > best_similarity and 
                    similarity > confidence_threshold and 
                    name not in recognized_in_image):
                    best_match = name
                    best_similarity = similarity

            # Create detection record
            detection = {
                "imageIndex": image_index,
                "faceIndex": face_idx,
                "bbox": bbox,
                "confidence": float(best_similarity),
                "studentId": best_match if best_match else None
            }

            detections.append(detection)
            
            if best_match:
                recognized_in_image.add(best_match)

        # Save annotated image for debugging
        save_annotated_image(pil_original, faces, known_faces, 
                           os.path.basename(image_path), recognized_in_image)

    except Exception as e:
        print(f"Error processing {image_path}: {e}", file=sys.stderr)

    return detections

def cosine_similarity(a, b):
    """Calculate cosine similarity between two vectors"""
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def save_annotated_image(pil_image, faces, known_faces, image_name, recognized_names):
    """Save annotated image with bounding boxes and labels"""
    try:
        draw = ImageDraw.Draw(pil_image)
        
        # Try to load font
        try:
            font = ImageFont.truetype("arial.ttf", 30)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 30)
            except:
                font = ImageFont.load_default()

        for face in faces:
            bbox = face.bbox.astype(int)
            embedding = face.normed_embedding / np.linalg.norm(face.normed_embedding)

            # Find best match
            best_match = "Unknown"
            best_similarity = 0.0

            for name, known_emb in known_faces.items():
                similarity = cosine_similarity(embedding, known_emb)
                if similarity > best_similarity and similarity > 0.40:
                    best_match = name.capitalize()
                    best_similarity = similarity

            # Choose colors based on recognition
            box_color = "green" if best_match != "Unknown" else "red"
            text_color = "white" if best_match != "Unknown" else "red"
            similarity_display = f"{best_similarity:.2f}"

            # Draw bounding box and label
            draw.rectangle([bbox[0], bbox[1], bbox[2], bbox[3]], 
                          outline=box_color, width=3)
            
            # Draw background for text
            text = f"{best_match} ({similarity_display})"
            text_bbox = draw.textbbox((bbox[0], bbox[1] - 35), text, font=font)
            draw.rectangle(text_bbox, fill=box_color)
            draw.text((bbox[0], bbox[1] - 35), text, fill=text_color, font=font)

        # Save annotated image
        output_path = os.path.join(OUTPUT_FOLDER, f"recognized_{image_name}")
        pil_image.save(output_path)
        
    except Exception as e:
        print(f"Error saving annotated image: {e}", file=sys.stderr)

if __name__ == "__main__":
    main()