import { useEffect } from 'react';
import { usePage } from '@inertiajs/react';
import toast from 'react-hot-toast';

// Survives layout remounts and history navigation, without persistent browser storage.
const shownMessages = new Set();

export default function FlashMessages() {
    const { flash } = usePage().props;

    useEffect(() => {
        if (!flash?.message && !flash?.error) return;
        const id = flash.toast_id || JSON.stringify([flash.message, flash.error]);
        if (shownMessages.has(id)) return;
        shownMessages.add(id);
        if (shownMessages.size > 100) shownMessages.delete(shownMessages.values().next().value);

        if (flash.message) toast.success(flash.message, { id: `flash-success-${id}` });
        if (flash.error) toast.error(flash.error, { id: `flash-error-${id}` });
    }, [flash?.toast_id, flash?.message, flash?.error]);

    return null;
}
