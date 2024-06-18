from enum import Enum
from dataclasses import dataclass

from pylsl import resolve_byprop

from .Bessy import Bessy
from .EmotivEegSource import EmotivEegSource


class TrainingLabels(Enum):
    Rest = 0
    Action = 1


class TrainingState(Enum):
    Stop = 1
    Start = 2
    Rest = 3
    Action = 4
    Complete = 5


@dataclass
class TrainingStatus:
    state: TrainingState
    trials: int


class PredictionState:
    Stop = 1
    Rest = 2
    Action = 3
