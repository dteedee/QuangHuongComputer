import React from 'react';

interface CustomHtmlProps {
    title?: string;
    config: {
        html: string;
    };
}

export const CustomHtml: React.FC<CustomHtmlProps> = ({ config }) => {
    return (
        <div className="max-w-[1400px] mx-auto px-4 mt-12">
            <div 
                className="custom-html-section"
                dangerouslySetInnerHTML={{ __html: config.html }} 
            />
        </div>
    );
};
