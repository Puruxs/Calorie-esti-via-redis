"""Prepare Food-101 dataset for CalEst CNN training.
Run: python prepare_dataset.py
This downloads Food-101 via TensorFlow Datasets (large download; allow time/disk space).
"""
import tensorflow_datasets as tfds

if __name__ == '__main__':
    builder = tfds.builder('food101')
    builder.download_and_prepare()
    print('Food-101 dataset prepared at:', builder.data_dir)
    print('Class count:', builder.info.features['label'].num_classes)
    print('Use train_cnn.py to train the classifier.')
