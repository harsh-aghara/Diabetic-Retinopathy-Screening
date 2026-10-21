"""Grad-CAM visual explainer for CustomDRCNN models.

Computes class activation maps for the penultimate convolutional block (conv5)
in a single forward + backward computation pass. Produces an RGBA PNG heatmap
where the alpha channel maps activation intensity for transparent browser overlay.
Faithfully follows the canonical implementation from notebooks/code2_2.ipynb and
notebooks/test_models.ipynb.
"""

import base64
from collections.abc import Sequence
from typing import Any

import cv2
import numpy as np
import torch
from torch import nn


def generate_gradcam_heatmap(
    model: nn.Module,
    target_layer: nn.Module,
    input_tensor: torch.Tensor,
    target_class: int | Sequence[int] | None = None,
) -> tuple[torch.Tensor, str]:
    """Execute single forward + backward pass to produce logits and an RGBA heatmap.

    Args:
        model: PyTorch model in eval mode.
        target_layer: Module layer to hook (e.g. model.conv5).
        input_tensor: Standardized tensor of shape (1, 3, 224, 224).
        target_class: Target class index, sequence of class indices to sum, or None
            to default to argmax predicted class.

    Returns:
        tuple containing:
        - raw logits tensor of shape (1, num_classes)
        - base64 data URL string for RGBA PNG heatmap
    """
    activations: list[torch.Tensor] = []
    gradients: list[torch.Tensor] = []

    def forward_hook(_module: nn.Module, _inp: Any, output: torch.Tensor) -> None:
        activations.append(output)

    def backward_hook(
        _module: nn.Module,
        _grad_input: tuple[torch.Tensor | None, ...],
        grad_output: tuple[torch.Tensor, ...],
    ) -> None:
        gradients.append(grad_output[0])

    fwd_handle = target_layer.register_forward_hook(forward_hook)
    bwd_handle = target_layer.register_full_backward_hook(backward_hook)

    try:
        model.zero_grad()
        tensor = input_tensor.clone().detach().requires_grad_(True)
        logits = model(tensor)

        if target_class is None:
            chosen_class = int(torch.argmax(logits, dim=1).item())
            target_score = logits[0, chosen_class]
        elif isinstance(target_class, (int, np.integer)):
            target_score = logits[0, int(target_class)]
        else:
            target_score = sum(logits[0, int(c)] for c in target_class)

        target_score.backward(retain_graph=False)

        if not activations or not gradients:
            raise RuntimeError(
                "Grad-CAM hooks failed to capture activations or gradients."
            )

        act = activations[0].detach().cpu().numpy()[0]  # (128, 56, 56)
        grad = gradients[0].detach().cpu().numpy()[0]  # (128, 56, 56)

        weights = np.mean(grad, axis=(1, 2))  # (128,)
        cam = np.zeros(act.shape[1:], dtype=np.float32)  # (56, 56)

        for i, w in enumerate(weights):
            cam += w * act[i]

        cam = np.maximum(cam, 0)
        target_h, target_w = input_tensor.shape[2], input_tensor.shape[3]
        cam = cv2.resize(cam, (target_w, target_h), interpolation=cv2.INTER_LINEAR)

        cam_max = float(np.max(cam))
        if cam_max > 1e-6:
            cam_min = float(np.min(cam))
            if cam_max > cam_min:
                cam = (cam - cam_min) / (cam_max - cam_min)
            else:
                cam = cam / cam_max

            cam = np.clip(cam, 0.0, 1.0)
            cam_uint8 = (cam * 255.0).astype(np.uint8)
            heatmap_bgr = cv2.applyColorMap(cam_uint8, cv2.COLORMAP_JET)
            heatmap_bgra = cv2.cvtColor(heatmap_bgr, cv2.COLOR_BGR2BGRA)
            heatmap_bgra[:, :, 3] = cam_uint8
        else:
            heatmap_bgra = np.zeros((target_h, target_w, 4), dtype=np.uint8)

        success, buffer = cv2.imencode(".png", heatmap_bgra)
        if not success:
            raise RuntimeError("Failed to encode Grad-CAM heatmap to PNG format.")

        png_b64 = "data:image/png;base64," + base64.b64encode(buffer).decode("ascii")
        return logits.detach(), png_b64

    finally:
        fwd_handle.remove()
        bwd_handle.remove()
