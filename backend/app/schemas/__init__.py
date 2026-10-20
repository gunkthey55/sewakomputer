from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from decimal import Decimal
from app.models import RoleEnum, RentalStatusEnum, NotificationTypeEnum, NotificationStatusEnum, ReminderChannelEnum


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    role: RoleEnum = RoleEnum.CUSTOMER


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=50)
    role: Optional[RoleEnum] = None
    is_active: Optional[bool] = None
    telegram_chat_id: Optional[str] = Field(None, max_length=100)


class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    telegram_chat_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UserWithRelations(UserResponse):
    rentals: List["RentalResponse"] = []
    notifications: List["NotificationResponse"] = []


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: int
    exp: int
    type: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8, max_length=100)


class ComputerBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    serial_number: str = Field(..., min_length=1, max_length=100)
    brand: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[Decimal] = None
    rental_price_per_day: Decimal = Field(..., ge=0)
    rental_price_per_week: Decimal = Field(..., ge=0)
    rental_price_per_month: Decimal = Field(..., ge=0)
    is_available: bool = True
    is_active: bool = True
    location: Optional[str] = Field(None, max_length=255)


class ComputerCreate(ComputerBase):
    pass


class ComputerUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    serial_number: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, min_length=1, max_length=100)
    model: Optional[str] = Field(None, min_length=1, max_length=100)
    purchase_date: Optional[datetime] = None
    purchase_price: Optional[Decimal] = None
    rental_price_per_day: Optional[Decimal] = Field(None, ge=0)
    rental_price_per_week: Optional[Decimal] = Field(None, ge=0)
    rental_price_per_month: Optional[Decimal] = Field(None, ge=0)
    is_available: Optional[bool] = None
    is_active: Optional[bool] = None
    location: Optional[str] = Field(None, max_length=255)


class ComputerResponse(ComputerBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime


class ComputerWithComponents(ComputerResponse):
    components: List["ComponentResponse"] = []


class ComponentBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    component_type: str = Field(..., min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    specifications: Optional[str] = None


class ComponentCreate(ComponentBase):
    computer_id: int


class ComponentUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    component_type: Optional[str] = Field(None, min_length=1, max_length=100)
    brand: Optional[str] = Field(None, max_length=100)
    model: Optional[str] = Field(None, max_length=100)
    serial_number: Optional[str] = Field(None, max_length=100)
    specifications: Optional[str] = None


class ComponentResponse(ComponentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    computer_id: int
    created_at: datetime
    updated_at: datetime


class RentalItemBase(BaseModel):
    computer_id: int
    quantity: int = Field(..., ge=1)
    unit_price: Decimal = Field(..., ge=0)


class RentalItemCreate(RentalItemBase):
    pass


class RentalItemResponse(RentalItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rental_id: int
    total_price: Decimal
    created_at: datetime
    computer: Optional[ComputerResponse] = None


class RentalBase(BaseModel):
    user_id: int
    start_date: datetime
    end_date: datetime
    deposit: Decimal = Field(default=0, ge=0)
    notes: Optional[str] = None
    items: List[RentalItemCreate] = Field(..., min_length=1)


class RentalCreate(RentalBase):
    pass


class RentalUpdate(BaseModel):
    status: Optional[RentalStatusEnum] = None
    actual_return_date: Optional[datetime] = None
    notes: Optional[str] = None


class RentalResponse(RentalBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: RentalStatusEnum
    total_price: Decimal
    actual_return_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    items: List[RentalItemResponse] = []
    user: Optional[UserResponse] = None


class NotificationBase(BaseModel):
    user_id: int
    type: NotificationTypeEnum
    title: str = Field(..., min_length=1, max_length=255)
    message: str
    related_rental_id: Optional[int] = None


class NotificationCreate(NotificationBase):
    pass


class NotificationUpdate(BaseModel):
    status: Optional[NotificationStatusEnum] = None
    error_message: Optional[str] = None


class NotificationResponse(NotificationBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    status: NotificationStatusEnum
    sent_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime
    user: Optional[UserResponse] = None
    rental: Optional[RentalResponse] = None


class ScheduleBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    computer_id: int
    start_time: datetime
    end_time: datetime
    is_recurring: bool = False
    recurrence_rule: Optional[str] = Field(None, max_length=500)
    is_active: bool = True


class ScheduleCreate(ScheduleBase):
    pass


class ScheduleUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    computer_id: Optional[int] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    is_recurring: Optional[bool] = None
    recurrence_rule: Optional[str] = Field(None, max_length=500)
    is_active: Optional[bool] = None


class ScheduleResponse(ScheduleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime
    computer: Optional[ComputerResponse] = None


class PaginatedResponse(BaseModel):
    items: List[BaseModel]
    total: int
    page: int
    page_size: int
    total_pages: int


class MessageResponse(BaseModel):
    message: str


UserWithRelations.model_rebuild()
ComputerWithComponents.model_rebuild()


class ReminderResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    rental_id: int
    channel: ReminderChannelEnum
    days_before: int
    scheduled_for: datetime
    sent_at: Optional[datetime] = None
    is_sent: bool
    retry_count: int
    error_message: Optional[str] = None
    created_at: datetime