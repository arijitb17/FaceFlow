import os
import cv2
import numpy as np
from insightface.app import FaceAnalysis
import pickle
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

# Define Paths
TEST_FOLDER = "test-images"
OUTPUT_FOLDER = "output"
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

# Load Stored Face Embeddings (expects dict: {name: embedding})
with open("face_embeddings.pkl", "rb") as f:
    known_faces = pickle.load(f)

# Normalize all embeddings
for name in known_faces:
    known_faces[name] = known_faces[name] / np.linalg.norm(known_faces[name])

# Initialize Face Recognition Model
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0, det_size=(640, 640))  # Good balance

# Cosine Similarity
def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

# Process Each Image
for image_name in os.listdir(TEST_FOLDER):
    image_path = os.path.join(TEST_FOLDER, image_name)
    img = cv2.imread(image_path)

    if img is None or img.shape[0] == 0 or img.shape[1] == 0:
        print(f"Skipping {image_name}, invalid image file.")
        continue

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    pil_original = Image.fromarray(img_rgb)

    # Enhance version for detection
    pil_enhanced = pil_original.copy()
    pil_enhanced = ImageEnhance.Brightness(pil_enhanced).enhance(1.2)
    pil_enhanced = ImageEnhance.Contrast(pil_enhanced).enhance(1.5)
    pil_enhanced = ImageEnhance.Sharpness(pil_enhanced).enhance(2.0)

    detection_img = np.array(pil_enhanced)
    faces = app.get(detection_img)

    # Fallback: Try original if no faces found
    if len(faces) == 0:
        faces = app.get(np.array(pil_original))

    print(f"\nProcessing {image_name} - Faces Detected: {len(faces)}")

    draw = ImageDraw.Draw(pil_original)
    try:
        font = ImageFont.truetype("arial.ttf", 40)
    except:
        font = ImageFont.load_default()

    recognized_names = set()

    for face in faces:
        bbox = face.bbox.astype(int)

        # Draw bounding box for debug
        draw.rectangle([bbox[0], bbox[1], bbox[2], bbox[3]], outline="blue", width=4)

        # Normalize embedding
        embedding = face.normed_embedding
        embedding /= np.linalg.norm(embedding)

        # Recognition
        best_match = "Unknown"
        best_similarity = 0.0

        for name, known_emb in known_faces.items():
            similarity = cosine_similarity(embedding, known_emb)
            if similarity > best_similarity and similarity > 0.40 and name not in recognized_names:
                best_match = name.capitalize()
                best_similarity = similarity

        recognized_names.add(best_match)

        # Update colors and text
        box_color = "green" if best_match != "Unknown" else "red"
        text_color = "white" if best_match != "Unknown" else "red"
        similarity_display = f"{best_similarity:.2f}" if best_match != "Unknown" else "0.00"

        draw.rectangle([bbox[0], bbox[1], bbox[2], bbox[3]], outline=box_color, width=5)
        draw.text((bbox[0], bbox[1] - 50), f"{best_match} ({similarity_display})", fill=text_color, font=font)

        print(f" - Detected: {best_match} (Similarity: {similarity_display})")

    # Save result
    output_path = os.path.join(OUTPUT_FOLDER, f"output_{image_name}")
    pil_original.save(output_path)
    print(f"Saved: {output_path}")

print("\n✅ Face Recognition Complete! Check the 'output' folder.")

