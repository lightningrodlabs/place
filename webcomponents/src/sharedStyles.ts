import { css } from 'lit';

export const sharedStyles = css`
  :root {
    --mdc-theme-primary: #fcb8ab;
    --mdc-theme-secondary: #feeae6;
  }

  .column {
    display: flex;
    flex-direction: column;
  }
  .row {
    display: flex;
    flex-direction: row;
  }

  .tag-button {
    cursor: pointer;
  }

  .tags-container {
    min-height: 40px;
    font-size: 30px;
    line-height: 40px;
    padding: 5px;
    background-color: whitesmoke;
    margin-bottom: 10px;
  }
`;
