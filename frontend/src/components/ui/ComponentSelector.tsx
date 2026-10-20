import { useState, useMemo } from 'react';
import { Search, Plus, Minus, ChevronDown, ChevronUp, Filter, X } from 'lucide-react';
import { cn } from '../utils/helpers';
import { Button } from './Button';
import { Input } from './Input';
import { Badge, getComponentTypeLabel } from './Badge';
import { Modal } from './Modal';
import type { Component, ComponentType } from '../types';

interface ComponentSelectorProps {
  selectedComponents: Array<{ component: Component; quantity: number }>;
  onChange: (components: Array<{ component: Component; quantity: number }>) => void;
  availableComponents?: Component[];
  onFetchAvailable?: (type?: ComponentType) => Promise<Component[]>;
  allowMultiple?: boolean;
  showQuantity?: boolean;
  maxQuantity?: number;
  filterTypes?: ComponentType[];
}

export function ComponentSelector({
  selectedComponents,
  onChange,
  availableComponents: initialComponents = [],
  onFetchAvailable,
  allowMultiple = true,
  showQuantity = true,
  maxQuantity = 99,
  filterTypes,
}: ComponentSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<ComponentType | 'all'>('all');
  const [availableComponents, setAvailableComponents] = useState<Component[]>(initialComponents);
  const [isLoading, setIsLoading] = useState(false);

  const handleAddComponent = async (component: Component) => {
    const existing = selectedComponents.find((sc) => sc.component.id === component.id);
    if (existing && !allowMultiple) return;

    const newQuantity = showQuantity ? (existing?.quantity || 0) + 1 : 1;
    if (newQuantity > maxQuantity) return;

    const updated = existing
      ? selectedComponents.map((sc) => (sc.component.id === component.id ? { ...sc, quantity: newQuantity } : sc))
      : [...selectedComponents, { component, quantity: newQuantity }];
    
    onChange(updated);
  };

  const handleRemoveComponent = (componentId: string) => {
    const existing = selectedComponents.find((sc) => sc.component.id === componentId);
    if (!existing) return;

    if (showQuantity && existing.quantity > 1) {
      onChange(
        selectedComponents.map((sc) => 
          sc.component.id === componentId ? { ...sc, quantity: sc.quantity - 1 } : sc
        )
      );
    } else {
      onChange(selectedComponents.filter((sc) => sc.component.id !== componentId));
    }
  };

  const handleQuantityChange = (componentId: string, quantity: number) => {
    if (quantity <= 0) {
      handleRemoveComponent(componentId);
      return;
    }
    if (quantity > maxQuantity) return;

    onChange(
      selectedComponents.map((sc) => 
        sc.component.id === componentId ? { ...sc, quantity } : sc
      )
    );
  };

  const fetchComponents = async (type?: ComponentType) => {
    if (!onFetchAvailable) return;
    setIsLoading(true);
    try {
      const components = await onFetchAvailable(type);
      setAvailableComponents(components);
    } catch (error) {
      console.error('Failed to fetch components:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredComponents = useMemo(() => {
    return availableComponents.filter((comp) => {
      const matchesSearch = comp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.serialNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        comp.model.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = selectedType === 'all' || comp.type === selectedType;
      const notSelected = !selectedComponents.some((sc) => sc.component.id === comp.id) || allowMultiple;
      return matchesSearch && matchesType && notSelected && comp.status === 'available';
    });
  }, [availableComponents, searchQuery, selectedType, selectedComponents, allowMultiple]);

  const types: Array<{ value: ComponentType | 'all'; label: string }> = [
    { value: 'all', label: 'All Types' },
    { value: 'cpu', label: 'CPU' },
    { value: 'ram', label: 'RAM' },
    { value: 'storage', label: 'Storage' },
    { value: 'gpu', label: 'GPU' },
    { value: 'motherboard', label: 'Motherboard' },
    { value: 'psu', label: 'Power Supply' },
    { value: 'cooler', label: 'Cooler' },
    { value: 'case', label: 'Case' },
    { value: 'monitor', label: 'Monitor' },
    { value: 'keyboard', label: 'Keyboard' },
    { value: 'mouse', label: 'Mouse' },
    { value: 'other', label: 'Other' },
  ].filter((t) => !filterTypes || t.value === 'all' || filterTypes.includes(t.value));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Components ({selectedComponents.length})</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => { fetchComponents(); setIsModalOpen(true); }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Component
        </Button>
      </div>

      {selectedComponents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No components selected</p>
          <p className="text-sm mt-1">Click "Add Component" to select components for this rental</p>
        </div>
      ) : (
        <div className="space-y-2">
          {selectedComponents.map(({ component, quantity }) => (
            <div key={`${component.id}-${quantity}`} className="flex items-center justify-between p-3 border rounded-lg bg-card">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{component.name}</p>
                  <p className="text-sm text-muted-foreground truncate">
                    {component.serialNumber} • {getComponentTypeLabel(component.type)}
                  </p>
                </div>
                <Badge variant="success">Available</Badge>
              </div>
              <div className="flex items-center gap-2 ml-4">
                {showQuantity && (
                  <div className="flex items-center border rounded-lg">
                    <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(component.id, quantity - 1)} disabled={quantity <= 1}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <span className="px-3 text-sm font-mono">{quantity}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleQuantityChange(component.id, quantity + 1)} disabled={quantity >= maxQuantity}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleRemoveComponent(component.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Select Components"
        size="xl"
      >
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search components..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as ComponentType | 'all')}
              options={types.map((t) => ({ value: t.value, label: t.label }))}
              className="w-full sm:w-48"
            />
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filteredComponents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No available components found</p>
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto space-y-2">
              {filteredComponents.map((component) => (
                <button
                  key={component.id}
                  onClick={() => { handleAddComponent(component); if (!allowMultiple) setIsModalOpen(false); }}
                  className={cn(
                    'w-full p-3 border rounded-lg text-left transition-colors hover:bg-accent',
                    'flex items-center justify-between gap-3'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{component.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {component.serialNumber} • {component.manufacturer} {component.model}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="default">{getComponentTypeLabel(component.type)}</Badge>
                      <Badge variant="success">Available</Badge>
                    </div>
                  </div>
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: Array<{ value: string; label: string }>;
}

function Select({ options, className, ...props }: SelectProps) {
  return (
    <select className={cn('flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring', className)} {...props}>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}