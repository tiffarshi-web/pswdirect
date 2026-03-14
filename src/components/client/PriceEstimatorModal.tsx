import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Check, Clock, DollarSign, ArrowRight } from "lucide-react";
import { useServiceTasks } from "@/hooks/useServiceTasks";
import { getRatesForCategory } from "@/lib/pricingConfigStore";
import { getServiceCategoryForTasks, type ServiceCategory } from "@/lib/taskConfig";
import { getPricing } from "@/lib/businessConfig";

interface PriceEstimatorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CategoryFilter = "standard" | "doctor-appointment" | "hospital-discharge";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  standard: "Home Care",
  "doctor-appointment": "Doctor Escort",
  "hospital-discharge": "Hospital Discharge",
};

export const PriceEstimatorModal = ({ open, onOpenChange }: PriceEstimatorModalProps) => {
  const navigate = useNavigate();
  const { tasks: serviceTasks } = useServiceTasks();
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>("standard");
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);

  // Filter tasks by category
  const filteredTasks = useMemo(() => {
    if (selectedCategory === "standard") {
      return serviceTasks.filter(t => t.serviceCategory === "standard");
    }
    return serviceTasks.filter(t => t.serviceCategory === selectedCategory);
  }, [serviceTasks, selectedCategory]);

  // Reset selections when category changes
  const handleCategoryChange = (cat: CategoryFilter) => {
    setSelectedCategory(cat);
    setSelectedTasks([]);
    setSelectedDuration(1);
  };

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  // Estimated care time
  const estimatedMinutes = useMemo(() => {
    return selectedTasks.reduce((total, id) => {
      const task = serviceTasks.find(t => t.id === id);
      return total + (task?.includedMinutes || 30);
    }, 0);
  }, [selectedTasks, serviceTasks]);

  const estimatedHours = Math.max(1, estimatedMinutes / 60);

  // Auto-adjust duration
  const effectiveDuration = Math.max(selectedDuration, estimatedHours);

  // Pricing calculation using same engine as booking
  const pricing = useMemo(() => {
    const category: ServiceCategory = selectedTasks.length > 0
      ? getServiceCategoryForTasks(selectedTasks)
      : selectedCategory;
    const rates = getRatesForCategory(category);
    const hours = Math.max(effectiveDuration, 1);
    const additionalHalfHours = Math.max(0, Math.round((hours - 1) * 2));
    const baseCost = rates.firstHour + additionalHalfHours * rates.per30Min;

    const pricingConfig = getPricing();
    let surgeAmount = 0;
    if (pricingConfig.surgeMultiplier > 1) {
      surgeAmount = baseCost * (pricingConfig.surgeMultiplier - 1);
    }

    const subtotal = baseCost + surgeAmount;

    // Calculate taxable fraction based on selected tasks' apply_hst field
    let taxableFraction = 0; // Default: no tax until tasks confirm taxability
    if (selectedTasks.length > 0) {
      const taxableMinutes = selectedTasks.reduce((sum, id) => {
        const task = serviceTasks.find(t => t.id === id);
        return sum + (task?.applyHST ? (task?.includedMinutes || 0) : 0);
      }, 0);
      const totalTaskMinutes = selectedTasks.reduce((sum, id) => {
        const task = serviceTasks.find(t => t.id === id);
        return sum + (task?.includedMinutes || 0);
      }, 0);
      taxableFraction = totalTaskMinutes > 0 ? taxableMinutes / totalTaskMinutes : 0;
    }

    const taxableSubtotal = subtotal * taxableFraction;
    const hst = taxableSubtotal * 0.13;
    const total = subtotal + hst;

    return { subtotal: baseCost, surgeAmount, hst, total, hours };
  }, [effectiveDuration, selectedTasks, selectedCategory, serviceTasks]);

  const handleContinueToBook = () => {
    onOpenChange(false);
    navigate("/", {
      state: {
        category: selectedCategory,
        tasks: selectedTasks,
        duration: effectiveDuration,
      },
    });
    // Small delay to ensure state is passed
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 100);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="text-xl flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-primary" />
            Instant Price Estimate
          </DialogTitle>
          <DialogDescription>
            Select a service category, choose services, and see your estimated price instantly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
          <div className="space-y-5 pr-2">
            {/* Category Selector */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Service Category</Label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(CATEGORY_LABELS) as CategoryFilter[]).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    className={`p-2.5 rounded-lg border text-xs font-medium text-center transition-all ${
                      selectedCategory === cat
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border hover:border-primary/50 text-foreground"
                    }`}
                  >
                    {CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Services Needed</Label>
              <p className="text-xs text-muted-foreground">Minimum booking is 1 hour.</p>
              <div className="grid grid-cols-1 gap-1.5">
                {filteredTasks.map(task => {
                  const isSelected = selectedTasks.includes(task.id);
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className={`flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 text-primary"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <span className={`flex-1 text-sm ${isSelected ? "font-medium" : ""}`}>
                        {task.name}
                        <span className="text-muted-foreground font-normal"> ({task.includedMinutes} min)</span>
                        {task.applyHST && (
                          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium ml-1">+ HST</span>
                        )}
                      </span>
                      {isSelected && <Check className="w-4 h-4 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Estimated Care Time */}
            {selectedTasks.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    Estimated Care Time
                  </span>
                  <span className="text-lg font-bold text-primary">
                    {estimatedMinutes >= 60
                      ? `${(estimatedMinutes / 60) % 1 === 0 ? estimatedMinutes / 60 : (estimatedMinutes / 60).toFixed(1)} hours`
                      : `${estimatedMinutes} min`}
                  </span>
                </div>
              </div>
            )}

            {/* Duration Grid */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Duration</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {[1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12].map(hours => {
                  const isBelowEstimate = hours < estimatedHours;
                  return (
                    <button
                      key={hours}
                      type="button"
                      disabled={isBelowEstimate}
                      onClick={() => setSelectedDuration(hours)}
                      className={`p-1.5 rounded border text-center text-xs transition-all ${
                        effectiveDuration === hours
                          ? "border-primary bg-primary text-primary-foreground font-bold"
                          : isBelowEstimate
                          ? "border-border opacity-40 cursor-not-allowed"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {hours}h
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Breakdown */}
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <h4 className="font-semibold text-foreground flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-primary" />
                Price Estimate
              </h4>
              {selectedTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">Select a service above to see pricing.</p>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">{pricing.hours} hour{pricing.hours !== 1 ? "s" : ""} of care</span>
                    <span className="font-medium text-foreground">${pricing.subtotal.toFixed(2)}</span>
                  </div>
                  {pricing.surgeAmount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Surge Pricing</span>
                      <span className="font-medium text-amber-600">+${pricing.surgeAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-border pt-1.5 space-y-1">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium text-foreground">${(pricing.subtotal + pricing.surgeAmount).toFixed(2)}</span>
                    </div>
                    {pricing.hst > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">HST (13%)</span>
                        <span className="font-medium text-foreground">${pricing.hst.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-1">
                      <span className="font-semibold text-foreground">Total Estimate</span>
                      <span className="text-xl font-bold text-primary">${pricing.total.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Continue to Book */}
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={handleContinueToBook}
            >
              Continue to Book
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
