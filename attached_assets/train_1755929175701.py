import os
import cv2
import numpy as np
import imgaug.augmenters as iaa
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.manifold import TSNE
from sklearn.preprocessing import StandardScaler
from insightface.app import FaceAnalysis
import pickle

# Path Configuration
DATASET_PATH = "dataset"
OUTPUT_FILE = "face_embeddings.pkl"

# Initialize InsightFace ArcFace model
app = FaceAnalysis(name='buffalo_l', providers=['CPUExecutionProvider'])
app.prepare(ctx_id=0)

# Storage
embedding_vectors = []
labels = []

# Augmentation pipeline
augmenter = iaa.Sequential([
    iaa.Fliplr(0.5),
    iaa.Affine(rotate=(-10, 10)),
    iaa.GammaContrast((0.8, 1.2))
])

# Collect embeddings
face_dict = {}

for person_name in os.listdir(DATASET_PATH):
    person_path = os.path.join(DATASET_PATH, person_name)
    if not os.path.isdir(person_path):
        continue

    person_embeddings = []

    for image_name in os.listdir(person_path):
        image_path = os.path.join(person_path, image_name)
        img = cv2.imread(image_path)
        if img is None:
            print(f"Skipping broken file: {image_path}")
            continue
        img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        # Original image
        faces = app.get(img)
        if len(faces) > 0:
            emb = faces[0].normed_embedding
            person_embeddings.append(emb)
            embedding_vectors.append(emb)
            labels.append(person_name)

        # Augmented image
        aug_img = augmenter.augment_image(img)
        faces_aug = app.get(aug_img)
        if len(faces_aug) > 0:
            emb = faces_aug[0].normed_embedding
            person_embeddings.append(emb)
            embedding_vectors.append(emb)
            labels.append(person_name)

    # Average embedding for the person
    if person_embeddings:
        avg_embedding = np.mean(person_embeddings, axis=0)
        avg_embedding /= np.linalg.norm(avg_embedding)  # normalize
        face_dict[person_name.lower()] = avg_embedding

# Save embeddings dictionary
with open(OUTPUT_FILE, "wb") as f:
    pickle.dump(face_dict, f)

print(f"\n✅ Saved {len(face_dict)} identities to '{OUTPUT_FILE}'")

# === Visualization ===

embedding_vectors = np.array(embedding_vectors)
embedding_vectors = StandardScaler().fit_transform(embedding_vectors)

# Fit t-SNE
tsne = TSNE(n_components=2, perplexity=min(10, len(embedding_vectors) - 1),
            learning_rate=50, random_state=42)
reduced_embeddings = tsne.fit_transform(embedding_vectors)

# Plot
plt.figure(figsize=(8, 6))
sns.scatterplot(x=reduced_embeddings[:, 0], y=reduced_embeddings[:, 1],
                hue=labels, palette='tab10', s=80, alpha=0.8)

plt.xlabel("t-SNE Component 1")
plt.ylabel("t-SNE Component 2")
plt.title("Face Embeddings Clustering using t-SNE")
plt.legend(title="Folders", loc="best", bbox_to_anchor=(1, 1))
plt.tight_layout()
plt.show()
