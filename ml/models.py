"""Trainable project models. Checkpoints are generated from data, never fabricated."""
import torch
from torch import nn
from torchvision.models import resnet18, ResNet18_Weights

class Block(nn.Sequential):
    def __init__(self, inputs, outputs):
        super().__init__(nn.Conv2d(inputs, outputs, 3, padding=1, bias=False), nn.BatchNorm2d(outputs), nn.ReLU(), nn.Conv2d(outputs, outputs, 3, padding=1, bias=False), nn.BatchNorm2d(outputs), nn.ReLU())

class UNet(nn.Module):
    def __init__(self, channels=3, classes=2, width=24):
        super().__init__()
        self.encoder1, self.encoder2, self.bridge = Block(channels, width), Block(width, width*2), Block(width*2, width*4)
        self.decoder2, self.decoder1 = Block(width*6, width*2), Block(width*3, width)
        self.head, self.pool = nn.Conv2d(width, classes, 1), nn.MaxPool2d(2)
    def forward(self, x):
        a=self.encoder1(x); b=self.encoder2(self.pool(a)); c=self.bridge(self.pool(b))
        d=self.decoder2(torch.cat([nn.functional.interpolate(c, size=b.shape[-2:], mode="bilinear", align_corners=False),b],1))
        return self.head(self.decoder1(torch.cat([nn.functional.interpolate(d, size=a.shape[-2:], mode="bilinear", align_corners=False),a],1)))

class ImageClassifier(nn.Module):
    def __init__(self, classes=3, pretrained=False):
        super().__init__()
        self.backbone=resnet18(weights=ResNet18_Weights.DEFAULT if pretrained else None)
        self.backbone.fc=nn.Linear(self.backbone.fc.in_features, classes)
    def forward(self, x): return self.backbone(x)

class DamageClassifier(nn.Module):
    """Shared ResNet encoder for aligned before/after building crops."""
    def __init__(self, classes=4, pretrained=False):
        super().__init__()
        self.encoder=resnet18(weights=ResNet18_Weights.DEFAULT if pretrained else None)
        features=self.encoder.fc.in_features; self.encoder.fc=nn.Identity()
        self.head=nn.Sequential(nn.Linear(features*3,256),nn.ReLU(),nn.Dropout(.25),nn.Linear(256,classes))
    def forward(self, before, after):
        a,b=self.encoder(before),self.encoder(after)
        return self.head(torch.cat([a,b,torch.abs(b-a)],dim=1))

class BiLSTM(nn.Module):
    def __init__(self, vocabulary, classes, embedding=100, hidden=96):
        super().__init__()
        self.embedding=nn.Embedding(vocabulary,embedding,padding_idx=0)
        self.rnn=nn.LSTM(embedding,hidden,batch_first=True,bidirectional=True)
        self.head=nn.Sequential(nn.Dropout(.25),nn.Linear(hidden*2,classes))
    def forward(self, tokens):
        lengths=tokens.ne(0).sum(1).clamp(min=1).cpu()
        packed=nn.utils.rnn.pack_padded_sequence(self.embedding(tokens),lengths,batch_first=True,enforce_sorted=False)
        _,(hidden,_)=self.rnn(packed)
        return self.head(torch.cat([hidden[-2],hidden[-1]],1))

class MultimodalFusion(nn.Module):
    """Learned gating of paired image/text features; evaluates missing modalities."""
    def __init__(self, classes, language_model="bert-base-uncased", pretrained=True):
        super().__init__()
        from transformers import AutoModel, AutoConfig
        self.vision=resnet18(weights=ResNet18_Weights.DEFAULT if pretrained else None)
        size=self.vision.fc.in_features;self.vision.fc=nn.Identity()
        self.text=AutoModel.from_pretrained(language_model) if pretrained else AutoModel.from_config(AutoConfig.from_pretrained(language_model))
        self.image_projection=nn.Linear(size,256);self.text_projection=nn.Linear(self.text.config.hidden_size,256)
        self.gate=nn.Sequential(nn.Linear(512,256),nn.Sigmoid());self.head=nn.Linear(256,classes)
    def forward(self, image, input_ids, attention_mask, mode="fusion"):
        a=self.image_projection(self.vision(image))
        b=self.text_projection(self.text(input_ids=input_ids,attention_mask=attention_mask).last_hidden_state[:,0])
        if mode=="image": return self.head(a)
        if mode=="text": return self.head(b)
        gate=self.gate(torch.cat([a,b],1))
        return self.head(gate*a+(1-gate)*b)
