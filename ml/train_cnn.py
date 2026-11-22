"""Transfer-learning CNN for Food-101. Training is optional and compute-intensive.
Run after prepare_dataset.py: python train_cnn.py
Output: ml/food101_mobilenet.keras and ml/labels.txt
"""
import json
from pathlib import Path
import tensorflow as tf
import tensorflow_datasets as tfds

OUT = Path(__file__).parent
IMG_SIZE = (224, 224)
BATCH = 32

def preprocess(example):
    image = tf.image.resize(example['image'], IMG_SIZE) / 255.0
    return image, example['label']

if __name__ == '__main__':
    ds, info = tfds.load('food101', split=['train[:80%]', 'train[80%:]'], as_supervised=False, with_info=True)
    train = ds[0].map(preprocess, num_parallel_calls=tf.data.AUTOTUNE).shuffle(2000).batch(BATCH).prefetch(tf.data.AUTOTUNE)
    val = ds[1].map(preprocess, num_parallel_calls=tf.data.AUTOTUNE).batch(BATCH).prefetch(tf.data.AUTOTUNE)
    classes = info.features['label'].names
    base = tf.keras.applications.MobileNetV2(input_shape=(*IMG_SIZE, 3), include_top=False, weights='imagenet')
    base.trainable = False
    inputs = tf.keras.Input(shape=(*IMG_SIZE, 3))
    x = tf.keras.applications.mobilenet_v2.preprocess_input(inputs * 255.0)
    x = base(x, training=False)
    x = tf.keras.layers.GlobalAveragePooling2D()(x)
    x = tf.keras.layers.Dropout(.2)(x)
    outputs = tf.keras.layers.Dense(len(classes), activation='softmax')(x)
    model = tf.keras.Model(inputs, outputs)
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(train, validation_data=val, epochs=5, callbacks=[tf.keras.callbacks.EarlyStopping(patience=2, restore_best_weights=True)])
    model.save(OUT / 'food101_mobilenet.keras')
    (OUT / 'labels.txt').write_text('\n'.join(classes), encoding='utf-8')
    print('Saved model and labels in', OUT)
