"""CustomDRCNN neural network architecture for Diabetic Retinopathy screening."""

import torch
import torch.nn.functional as F
from torch import nn


class CustomDRCNN(nn.Module):
    """5-Block CNN Architecture with Batch Normalization and Dropout.

    Channels: 3 -> 8 -> 16 -> pool -> 32 -> pool -> 64 -> 128 -> fc1 (128) -> out (num_classes).
    Target layer for Grad-CAM is self.conv5.
    """

    def __init__(self, num_classes: int = 5) -> None:
        super().__init__()

        # Block 1: 3 -> 8
        self.conv1 = nn.Conv2d(3, 8, kernel_size=3, padding=1)
        self.bn1 = nn.BatchNorm2d(8)

        # Block 2: 8 -> 16
        self.conv2 = nn.Conv2d(8, 16, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm2d(16)

        # Pool 1: 224x224 -> 112x112
        self.pool1 = nn.MaxPool2d(2, 2)

        # Block 3: 16 -> 32
        self.conv3 = nn.Conv2d(16, 32, kernel_size=3, padding=1)
        self.bn3 = nn.BatchNorm2d(32)

        # Pool 2: 112x112 -> 56x56
        self.pool2 = nn.MaxPool2d(2, 2)

        # Block 4: 32 -> 64
        self.conv4 = nn.Conv2d(32, 64, kernel_size=3, padding=1)
        self.bn4 = nn.BatchNorm2d(64)

        # Block 5 (Target layer for Grad-CAM): 64 -> 128
        self.conv5 = nn.Conv2d(64, 128, kernel_size=3, padding=1)
        self.bn5 = nn.BatchNorm2d(128)

        # Dense Head
        self.dropout = nn.Dropout(0.5)
        self.fc1 = nn.Linear(128 * 56 * 56, 128)
        self.out = nn.Linear(128, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        """Forward pass through the 5-block CNN."""
        x = F.relu(self.bn1(self.conv1(x)))
        x = F.relu(self.bn2(self.conv2(x)))
        x = self.pool1(x)

        x = F.relu(self.bn3(self.conv3(x)))
        x = self.pool2(x)

        x = F.relu(self.bn4(self.conv4(x)))
        x = F.relu(self.bn5(self.conv5(x)))

        x = x.view(x.size(0), -1)
        x = self.dropout(x)
        x = F.relu(self.fc1(x))
        x = self.out(x)
        return x
